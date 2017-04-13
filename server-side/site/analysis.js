var esprima = require("esprima");
var options = {tokens:true, tolerant: true, loc: true, range: true };
var fs = require("fs");

var args = process.argv.slice(2);
if( args.length == 0 ){
   args=[4];
  }
var iters = args[0]; 

function main() {
  // var args = process.argv.slice(2);

  // if( args.length == 0 )
  // {
  //  args = ["analysis.js"];
  // }
  // var filePath = args[0];  

  var buildFail = false;
  var filePaths = ["routes/admin.js", "routes/create.js", "routes/csv.js", "routes/designer.js", "routes/live.js", 
          "routes/study.js", "routes/studyModel.js", "routes/upload.js"];

  for(var index in filePaths)
    buildFail =  complexity(filePaths[index]) || buildFail;


  // Report
  for( var node in builders )
  { 
    var builder = builders[node];
    builder.report();
  }

  console.log(buildFail);
}

var builders = [];

// Represent a reusable "class" following the Builder pattern.
function FunctionBuilder()
{
  this.StartLine = 0;
  this.FunctionName = "";
  // The number of parameters for functions
  this.ParameterCount  = 0,
  // Number of if statements/loops + 1
  this.SimpleCyclomaticComplexity = 0;
  // The max depth of scopes (nested ifs, loops, etc)
  this.MaxNestingDepth    = 0;
  // The max number of conditions if one decision statement.
  this.MaxConditions      = 0;

  this.report = function()
  {
    console.log(
       (
        "{0}(): {1}\n" +
        "============\n" +
         "SimpleCyclomaticComplexity: {2}\t" +
        "MaxNestingDepth: {3}\t" +
        "MaxConditions: {4}\t" +
        "Parameters: {5}\n\n"
      )
      .format(this.FunctionName, this.StartLine,
             this.SimpleCyclomaticComplexity, this.MaxNestingDepth,
              this.MaxConditions, this.ParameterCount)
    );
  }
};

// A builder for storing file level information.
function FileBuilder()
{
  this.FileName = "";
  // Number of strings in a file.
  this.Strings = 0;
  // Number of imports in a file.
  this.ImportCount = 0;

  this.NumDecisions = 0;
  this.LongFunctions = [];
  this.ComplexFunctions = [];

  this.report = function()
  {
    console.log (
      ( "{0}\n" +
        "~~~~~~~~~~~~\n"+
        // "ImportCount {1}\t" +
        // "Strings {2}\n" + 
        "NumDecisions {1}\n" + 
        "LongFunctions {2}\n" + 
        "ComplexFunctions {3}\n"
      ).format( this.FileName, this.NumDecisions, 
      this.LongFunctions, this.ComplexFunctions ));
  }
}

// A function following the Visitor pattern.
// Annotates nodes with parent objects.
function traverseWithParents(object, visitor)
{
    var key, child;

    visitor.call(null, object);

    for (key in object) {
        if (object.hasOwnProperty(key)) {
            child = object[key];
            if (typeof child === 'object' && child !== null && key != 'parent') 
            {
              child.parent = object;
          traverseWithParents(child, visitor);
            }
        }
    }
}

function complexity(filePath)
{
  var buf = fs.readFileSync(filePath, "utf8");
  var ast = esprima.parse(buf, options);

  var i = 0, count;

  // A file level-builder:
  var fileBuilder = new FileBuilder();
  fileBuilder.FileName = filePath;
  fileBuilder.ImportCount = 0;
  builders[filePath] = fileBuilder;

  // Tranverse program with a function visitor.
  traverseWithParents(ast, function (node) 
  {
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {

      var builder = new FunctionBuilder();
      builder.FunctionName = functionName(node);
      builder.StartLine    = node.loc.start.line;
      builder.ParameterCount = node.params.length;  
      // builders[builder.FunctionName] = builder;

      if( ( fileBuilder.LongFunctions.indexOf(builder.FunctionName) == -1 ) 
        && ( ( node.loc.end.line - node.loc.start.line ) > 100 ) )
        fileBuilder.LongFunctions.push(builder.FunctionName);
      

      traverseWithParents(node, function (cnode) {
        // body...
        if(cnode.type === 'IfStatement')  {
          count = countLogicalExpression(cnode.test);

          if(count > fileBuilder.NumDecisions)
            fileBuilder.NumDecisions = count;

        } else if( isLoop ( cnode.type ) 
          && fileBuilder.ComplexFunctions.indexOf(builder.FunctionName) == -1
          &&  orderOfComplexity( cnode.body, 1 )) {
            fileBuilder.ComplexFunctions.push(builder.FunctionName);
        }
      
      });
    } 
  });
  
  return ( fileBuilder.NumDecisions > 8 || fileBuilder.LongFunctions.length > 0  
      || fileBuilder.ComplexFunctions.length > 0);
}

function isLoop(type) {

  return (type === 'ForStatement' || type === 'ForInStatement' || type == 'WhileStatement');
}

function orderOfComplexity(body, depth) {
  // body...

  if(depth >= iters)
    return true; 

  var flag = false;
  traverseWithParents(body, function (cnode) {

    if(!flag && isLoop(cnode.type)) {

      flag = orderOfComplexity(cnode.body, depth + 1);
      // console.log(depth + " " + flag);
      
    }

  });

  return flag;
}

function countLogicalExpression(node) {

  if(node.type === 'LogicalExpression') {
    left = countLogicalExpression(node.left);
    right = countLogicalExpression(node.right);
    return left + right;
  }

  return 1;

}
// Helper function for counting children of node.
function childrenLength(node)
{
  var key, child;
  var count = 0;
  for (key in node) 
  {
    if (node.hasOwnProperty(key)) 
    {
      child = node[key];
      if (typeof child === 'object' && child !== null && key != 'parent') 
      {
        count++;
      }
    }
  } 
  return count;
}


// Helper function for checking if a node is a "decision type node"
function isDecision(node)
{
  if( node.type == 'IfStatement' || node.type == 'ForStatement' || node.type == 'WhileStatement' ||
     node.type == 'ForInStatement' || node.type == 'DoWhileStatement')
  {
    return true;
  }
  return false;
}

// Helper function for printing out function name.
function functionName( node )
{
  if( node.id )
  {
    return node.id.name;
  }
  // return "anon function @" + node.loc.start.line;

  return "anony";
}

// Helper function for allowing parameterized formatting of strings.
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

main();