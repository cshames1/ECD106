/**
 * Copyright (c) 2018, Douglas H. Summerville, Binghamton University
 *
 */

function schematic( graph )
{
	this.graph = graph;
	this.maxPortnameLength=20;
}

schematic.prototype.isVerilogReserved = function(str)
{
	var verilogReserved=new Set( ["always", "ifnone", "rpmos", "and", "initial", "rtran", "assign", "inout", "rtranif0", "begin", "input", "rtranif1", "buf", "integer", "scalared", "bufif0", "join", "small", "bufif1", "large", "specify", "case", "macromodule", "specparam", "casex", "medium", "strong0", "casez", "module", "strong1", "cmos", "nand", "supply0", "deassign", "negedge", "supply1", "default", "nmos", "table", "defparam", "nor", "task", "disable", "not", "time", "edge", "notif0", "tran", "else", "notif1", "tranif0", "end", "or", "tranif1", "endcase", "output", "tri", "endmodule", "parameter", "tri0", "endfunction", "pmos", "tri1", "endprimitive", "posedge", "triand", "endspecify", "primitive", "trior", "endtable", "pull0", "trireg", "endtask", "pull1", "vectored", "event", "pullup", "wait", "for", "pulldown", "wand", "force", "rcmos", "weak0", "forever", "real", "weak1", "fork", "realtime", "while", "function", "reg", "wire", "highz0", "release", "wor", "highz1", "repeat", "xnor", "if", "rnmos", "xor"]);
	return verilogReserved.has(str);
};

schematic.prototype.checkPortName= function(newstr)
{
	if( /^[UX].*$/.test(newstr) )
		return "Error: Port names cannot start with uppercase U or X";
	if( newstr.length > this.maxPortnameLength )
		return "Error: Port names must be less than" + this.maxPortnameLength + "characters";
	if( ! /^[A-TV-WY-Za-z][A-Za-z0-9_]*$/.test(newstr))
		return "Error: Port names must start with a letter (other than U or X) and contain only letters, numbers, or _";
	if( this.isVerilogReserved(newstr) )
		return  "Error:" + newstr + " is a Verilog reserved word and cannot be used as a port name";
	return "";
};
schematic.prototype.runDRC = function()
{
	var graph=this.graph;
	var numInputs=0;
	var numOutputs=0;
	var input_identifiers=new Set();
	var output_identifiers=new Set();
	function DRCMessages()
	{
		this.errors=new Array;
		this.warnings=new Array;
		this.addError=function(str,node){this.errors.push({msg:str,node:node})};
		this.addWarning=function(str,node){this.warnings.push({msg:str,node:node})};
		this.hasErrors=function(){ return this.errors.length != 0;}
		this.hasWarnings=function(){ return this.warnings.length != 0;}
	}
	var Messages=new DRCMessages;

	nodes=graph.getChildVertices(graph.getDefaultParent());
	nodes.forEach(function(item){
		var muxsize=1;
		var decodersize=2
		var fan_in=2;
			var style=graph.getCellStyle(item);
		switch( style["shape"] )
		{
		case "constant0":
		case "constant1":
			break;
		case "outputport":
			if( item.numLinksInto() === 0 )
				Messages.addError("Output port must be connected to an input port or gate output",item);
			numOutputs++;
			if( item.value == "" )
				Messages.addWarning("Output port is unnamed: a default name will be provided",item);
			else
			{
				portnameError=this.checkPortName(item.value);
				if( portnameError != "")
					Messages.addError(portnameError,item);
			}
			if( input_identifiers.has(item.value))
				Messages.addError("Port name "+item.value+ " is used on input(s) and output(s)",item);
			if( output_identifiers.has(item.value))
				Messages.addError("Port name "+item.value+ " is used on multiple outputs",item);
			if( item.value != "" ) output_identifiers.add(item.value);
			break;
		case "inputport":
			if( item.numLinksOutOf() === 0 )
				Messages.addWarning("Input port is unconnected",item);
			numInputs++;
			if( item.value == "" )
				Messages.addWarning("Input port is unnamed: a default name will be provided",item);
			else
			{
				portnameError=this.checkPortName(item.value);
				if( portnameError != "")
					Messages.addError(portnameError,item);
			}
			if( output_identifiers.has(item.value))
				Messages.addError("Port name "+item.value+ " is used on output(s) and input(s)",item);
			if( item.value != "" ) input_identifiers.add(item.value);
			break;
		case "buffer":
		case "inverter": fan_in=1;
		case "and":
		case "nand":
		case "or":
		case "nor":
		case "xor":
		case "xnor":
			if( item.numLinksOutOf() == 0 )
				Messages.addWarning("Gate has an unconnected output",item);
			if( item.numLinksInto() < fan_in )
				Messages.addError("Gate must have at least "+fan_in+" input(s) connected",item);
			break;

			/*
		case "mux16":muxsize++;
		case "mux8":muxsize++;
		case "mux4":muxsize++;
		case "mux2":
			if( item.getLinks("in_s",false).length != muxsize)
				Messages.addError("All MUX \"select\" input(s) must be connected",item);
			if( item.numLinksOutOf() == 0 )
				Messages.addWarning("MUX has an unconnected output",item);
			if( item.getLinks("in_i",false).length != (1<<muxsize))
				Messages.addWarning("MUX has an unconnected data input(s)",item);
			break;
		case "decoder4":decodersize++;
		case "decoder3":decodersize++;
		case "decoder2":
			if( item.getLinks("in_a",false).length != decodersize)
				Messages.addError("All Decoder address inputs must be connected",item);
			if( item.getLinks("in_en",false).length != 1)
				Messages.addError("Decoder enable input must be connected",item);
			for( var i=0; i<(1<<decodersize); i=i+1 )
			{
				if( item.getLinks("out_"+(i+1)+"_",true).length == 0)
				{
					Messages.addWarning("Decoder has an unconnected data output(s)",item);
					break;
				}
			}
			break;
		case "srlatch_en":
			if( item.getLinks("in_en",false).length == 0)
				Messages.addError("SR Latch enable input must be connected",item);
		case "srlatch":
			if( item.getLinks("in_S",false).length == 0)
				Messages.addError("SR Latch Set (S) input must be connected",item);
			if( item.getLinks("in_R",false).length == 0)
				Messages.addError("SR Latch Reset (R) input must be connected",item);
			if( item.numLinksOutOf() == 0 )
				Messages.addWarning("SR Latch has an unconnected output",item);
			break;
		case "dlatch_en":
			if( item.getLinks("in_en",false).length == 0)
				Messages.addError("D Latch enable (en) input must be connected",item);
		case "dlatch":
			if( item.getLinks("in_G",false).length == 0)
				Messages.addError("D Latch gate (G) input must be connected",item);
			if( item.getLinks("in_D",false).length == 0)
				Messages.addError("D Latch data (D) input must be connected",item);
			if( item.numLinksOutOf() == 0 )
				Messages.addWarning("Latch has an unconnected output",item);
			break;
		case "dff_en":
			if( item.getLinks("in_en",false).length == 0)
				Messages.addError("Flip-Flop enable (en) input must be connected",item);
		case "dff":
			if( item.getLinks("in_>",false).length == 0)
				Messages.addError("Flip-Flop clock input must be connected",item);
			if( item.getLinks("in_D",false).length == 0)
				Messages.addError("Flip-Flop D input must be connected",item);
			if( item.numLinksOutOf() == 0 )
				Messages.addWarning("Flip-Flop has an unconnected output",item);
			break;
			*/

		case "busdecoder2":
		case "busencoder2":
		case "busdecoder4":
		case "busencoder4":
		case "busdecoder8":
		case "busencoder8":
		case "busdecoder16":
		case "busencoder16":
		case "busdecoder32":
		case "busencoder32":	
		}
	},this);
	if( numOutputs===0 )
		Messages.addError("Schematic must have at least one connected output",null);
	if( numInputs===0 )
		Messages.addWarning("Schematic has not connected inputs",null);
	return Messages;
};
/*
//Tomer's code for writing verilog
schematic.prototype.createVerilog=function(moduleName)
{
	
	var verilogCode="";
	var assignList="";
	//used to reference the current schematic
	var graph=this.graph;

	//variables used to hold input/output port names
	var input_counter = 0;
	var output_counter = 0;
	var ports = new Object();
	ports["output"] = new Array();
	ports["input"] = new Array();

	//variables to hold information and write instatiations for importedModules
	var sourcePort = "";
	var targetPort = "";
	var importedModules = new Object();

	//variable used to hold wires
	var wire_counter = 0;
	var wire_connections = 0
	var wires = new Array();

	//variable used to name module
	//var moduleName= name; //name will always be schematic1

	//holds Id that MxGraph has assigned current node
	var node_Id;

	//retrieves all nodes in the current schematic
	nodes=graph.getChildVertices(graph.getDefaultParent());

	//iterate over all nodes in the schematic
	if( nodes ) nodes.forEach(function(node){

		var style=graph.getCellStyle(node);
		var module = style["shape"];	
		node_Id = node.getId();

		if( module == "inputport" || module == "outputport" )
			return;
		//the importedModules object holds the instations for imported modules
		if (module in importedModules)
		{
			var info = {}
			importedModules[module].push(info);
			importedModules[module][importedModules[module].length - 1]["inputs"] = [];
			importedModules[module][importedModules[module].length - 1]["outputs"] = [];
		}
		else
		{
			importedModules[module] = [];
			var info = {}
			importedModules[module].push(info);
			importedModules[module][importedModules[module].length - 1]["inputs"] = [];
			importedModules[module][importedModules[module].length - 1]["outputs"] = [];
		}



		//find all edges connected to this node in the graph and iterate over each edge
		Edges = graph.getEdges(node, graph.getDefaultParent());
		if( Edges ) Edges.forEach(function(Edge){

			//find the source of this edge
			var sourceStyle = Edge["source"]["style"];
			var start = sourceStyle.search(/=/);
			var end = sourceStyle.search(/;|$/);
			sourceStyle = sourceStyle.substring(start+1, end)

			//find the target of this edge
			var targetStyle = Edge["target"]["style"];
			var start = targetStyle.search(/=/);
			var end = targetStyle.search(/;|$/);
			targetStyle = targetStyle.substring(start+1, end)


			//start building instations for the imported modules

			//adds any edges connected to the imported component that are connected to an output port or input port
			if ( sourceStyle === "inputport" || targetStyle === "outputport" )
			{
				
				//if imported module is the source
				if( targetStyle == "outputport" )
				{
					if( Edge["target"]["value"] ) {
						ports["output"].push(Edge["target"]["value"])
					}
					else {
						ports["output"].push("O" + output_counter++);
					}
					var links = node.numLinksOutOf();
					if (links>1 && isBasicGate(module)) {
						var wire = importedModules[module][importedModules[module].length - 1]["outputs"].pop();
						if (wires.includes(wire)) {
							importedModules[module][importedModules[module].length - 1]["outputs"].push(wire);
						}
						else {
							wires.push("wire" + wire_counter);
							importedModules[module][importedModules[module].length - 1]["outputs"].push(wires[wires.length-1]);
						}
						assignList += ("\nassign " + ports["output"][ports["output"].length-1] + " = " + importedModules[module][importedModules[module].length - 1]["outputs"] + ";");
					}
					else if (isBasicGate(module)) {
						importedModules[module][importedModules[module].length - 1]["outputs"].push(ports["output"][ports["output"].length - 1]);
					}
					else {
						sourcePort = Edge["style"].match(/sourcePort=(.*?);/)[1].split("_")[0];
						importedModules[module][importedModules[module].length - 1]["outputs"].push("\n\t." + sourcePort + "(" + ports["output"][ports["output"].length - 1] + ")");
					}
				}
				// if imported module is the target
				else if( sourceStyle === "inputport" )
				{
					if( Edge["source"]["value"] ) {
						ports["input"].push(Edge["source"]["value"])
					}
					else {
						ports["input"].push("I" + input_counter++);	
					}				
					if (isBasicGate(module)) {
						importedModules[module][importedModules[module].length - 1]["inputs"].push(ports["input"][ports["input"].length - 1]);
					}
					else {
						targetPort = Edge["style"].match(/targetPort=(.*?);/)[1].split("_")[0];
						importedModules[module][importedModules[module].length - 1]["inputs"].push("\n\t." + targetPort + "(" + ports["input"][ports["input"].length - 1] + ")");
					}
				}
			}
			//adds any edges connected to the imported component that are connected by a wire
			else
			{
				//remove issues that causes a wire in running between two modules to have
				//different values. This forces wires between modules to have the same name
				if ((wire_connections) % 2 != 0)
				{
					wires.push("wire" + (wire_counter - 1));
				}
				else
				{
					wires.push("wire" + wire_counter);
					wire_counter++;
				}
				wire_connections++;
				//TODO: Is there an else case for when the wire does not match the current node at all?
				if (Edge["source"].getId() === node_Id){
					if (isBasicGate(module)) {
						if (importedModules[module][importedModules[module].length - 1]["outputs"].includes(wires[wires.length-1])==false) {
							importedModules[module][importedModules[module].length - 1]["outputs"].push(wires[wires.length-1]);
						}
					}
					else {
						sourcePort = Edge["style"].match(/sourcePort=(.*?);/)[1].split("_")[0];
						importedModules[module][importedModules[module].length - 1]["outputs"].push("\n\t." + sourcePort + "(" + wires[wires.length - 1] + ")");
					}
				}
				else if ( Edge["target"].getId() === node_Id){
					if ( isBasicGate(module)){
						if (importedModules[module][importedModules[module].length - 1]["inputs"].includes(wires[wires.length-1])==false) {
							//TODO: the bug is the argument to the push function below
							importedModules[module][importedModules[module].length - 1]["inputs"].push(wires[wires.length-1]);
						}
					}
					else {
						targetPort = Edge["style"].match(/targetPort=(.*?);/)[1].split("_")[0];
						importedModules[module][importedModules[module].length - 1]["inputs"].push("\n\t." + targetPort + "(" + wires[wires.length - 1] + ")");
					}
				}
			}

		});
	});
	function isBasicGate(moduleType) {
		return     moduleType == "and" 
				|| moduleType == "nand"
				|| moduleType == "or"
				|| moduleType == "nor"
				|| moduleType == "xor"
				|| moduleType == "xnor"
				|| moduleType == "inverter"
				|| moduleType == "buffer";
	}
	function objNameToVerilog(objName) {
		if (isBasicGate(objName)) {
			var gateNames={and:"and", nand:"nand",or:"or",nor:"nor",xor:"xor",xnor:"xnor",buffer:"buf", inverter:"not"};
			verilogWord = gateNames[objName];
		}
		else {
			verilogWord = objName;
		}
		return verilogWord;
	}


	wires = [...new Set(wires)];

	//creat verilog code for export
	verilogCode+="module ";
	verilogCode+=(moduleName!=="")?moduleName:"mymodule";
	verilogCode+= "(" ;
	//adds outputs and inputs for the current schematic to verilogCode
	ports["input"].forEach( function(item){
		verilogCode+="\n\tinput " + item + ',';
	});
	ports["output"].forEach( function(item){
		verilogCode+="\n\toutput " + item + ',';
	});
	verilogCode=verilogCode.replace(/, *$/gi, '');
	verilogCode+="\n);";
	//adds all wires needed in the current schematic to verilogCode
	if( wires.length )
		verilogCode+="\n\nwire "+(wires).join(", ")+";";
	//adds all assigns
	if( assignList != '' )
		verilogCode+="\n"+assignList;
	//adds all imported modules in the current scehmatic to verilogCode
	if( importedModules )
	{

		// list of all node shapes in order
		var modules = [];

		// for each node, create an instantiation
		if( nodes ) nodes.forEach(function(node){

			//push newest node style into array
			var style = graph.getCellStyle(node);
			var module = style["shape"];
			modules.push(module);

			// how many times this node has been instantiated
			var iter = 0;
			// list of nodes styles must be greater than 1 to do a comparison
			if (modules.length > 1)
			{
				// THIS IS INNEFICIENT, FIND A BETTER WAY TO DO IT
				for(var i = 0; i < modules.length-1; i++)
				{
					if (modules[i] === modules[modules.length-1])
						iter++;
				}
			}

			//do not create an instantiation for a port
			if( modules[modules.length-1] == "inputport" || modules[modules.length-1] == "outputport" )
				return;

			//begin adding instantiation to verilogCode
			verilogCode+="\n\n" + objNameToVerilog(modules[modules.length-1]) + " " + objNameToVerilog(modules[modules.length-1]) + "_" + (iter) + "(";
			for (var inputport of importedModules[module][iter]["inputs"]){
				verilogCode+=inputport + ", ";
			}
			for (var outputport of importedModules[module][iter]["outputs"]){
				verilogCode+=outputport + ", ";
			}
			// remove last comma and trailing space to correct syntax, due to a comma being placed after every output
			verilogCode = verilogCode.slice(0, verilogCode.length-2);
			verilogCode+=");";
		});
	}
	verilogCode+="\n\nendmodule\n";
	//returns complete verilog code ready for synthesis
	return verilogCode;
};
*/
schematic.prototype.createVerilog=function(name)
{
	var netList="";
	var inputList="";
	var inputSet=new Set();
	var assignList="";
	var wireList="";
	var wireSet=new Set();
	var outputList="";
	var netAliases={};
	var gateInputs={};
	var moduleName= name;
	var verilogCode="";
	var graph=this.graph;
	var gateNames={and:"and", nand:"nand",or:"or",nor:"nor",xor:"xor",xnor:"xnor",buffer:"buf", inverter:"not",mux2:"mux #(2,1)", mux4:"mux #(4,1)", mux8:"mux #(8,1)", mux16:"mux #(16,1)",decoder2:"decoder #(2,1)",decoder3:"decoder #(3,1)",decoder4:"decoder #(4,1)",dlatch:"d_latch",dlatch_en:"d_latch_en",dff:"dff",dff_en:"dff_en",srlatch:"sr_latch",srlatch_en:"sr_latch_en"};
	function gateName( node, prefix){ return prefix+node.id;}
	function portName( node, prefix ){ return node.value ? node.value : gateName(node,prefix);}
	function netName( link ){
		var oPortName=/sourcePort=out([^_]*)/.exec(link.style);
		if( oPortName[1] == "" )
			return 'X'+link.source.id;
		else
			return 'X'+link.source.id + '_'+ oPortName[1];
	}
	function getNameOrAlias( link ){
		var x= netAliases[netName(link)] ;
		return x ? x : netName(link);
	}
	
	nodes=graph.getChildVertices(graph.getDefaultParent());
	
	//name the nets
	if( nodes ) nodes.forEach(function(item){
		var style=graph.getCellStyle(item); 
		var muxsize=0;
		var decodersize=1;
		var module = style["shape"];
		switch( module )
		{
			case "inputport": 
				var links=item.linksOutOf();
				if( item.value && links.length )
					netAliases[netName(links[0])] = item.value;
				else if( links.length )
					netAliases[netName(links[0])] = portName(item,"I");
				break;
			case "constant0": 
				var links=item.linksOutOf();
				if( item.value && links.length )
					links.forEach( function( link ){
					netAliases[netName(link)] = '1\'b0';});
				break;
			case "constant1": 
				var links=item.linksOutOf();
				if( item.value && links.length )
					links.forEach( function( link ){
					netAliases[netName(link)] = '1\'b1';});
				break;
		}
	});
	//map the netlist
	if( nodes ) nodes.forEach(function(item){
		var muxsize=0;
		var decodersize=1;
		var style=graph.getCellStyle(item); 
		switch( style["shape"] )
		{
		case "and":
		case "nand":
		case "or":
		case "nor":
		case "xor":
		case "xnor":
		case "buffer":
		case "inverter":
			//determine if output net name is port name
			var linksout=item.linksOutOf();
			if( linksout.length == 1 && 
				graph.getCellStyle(linksout[0].target)["shape"] == "outputport" ) 
				netAliases[netName(linksout[0])] = portName(linksout[0].target,"O");
			//else add net name to wire list
			else if( linksout.length )
				//wireList+=' '+netName(linksout[0],"X") + ',';
				wireSet.add(netName(linksout[0],"X"));
			else
				//wireList+= ' '+gateName(item,"X") + ',';
				wireSet.add(gateName(item,"X") );
			break;
		default:
			break;
		}
	});
	//dump Verilog
	if( nodes )
	nodes.forEach(function(item){
		var muxsize=0;
		var decodersize=1;
		var style=graph.getCellStyle(item); 
		switch( style["shape"] )
		{
		case "inputport":
			inputList+="\n\tinput " + portName(item,'I') + ',';
			inputSet.add( portName(item,'I') );
			break;
		case "outputport":
			outputList+="\n\toutput " + portName(item,'O') + ',';
			var link=item.linksInto();
			if( link.length == 0 )
			{
				assignList += "\nassign " + portName(item,"O") + " = 1\'bx;" ;
			}
			else if( getNameOrAlias(link[0]) != portName(item,"O")) 
			{
				assignList += "\nassign " + portName(item,"O") + " = " ;
				assignList += getNameOrAlias(link[0])  + ";";
			}
			break;
		case "inverter":
		case "buffer":
			netList += "\n\n" + gateNames[style["shape"]] + ' ' + gateName(item,"U") + " ("; 
			var links=item.linksOutOf();
			if( links.length )
				netList += getNameOrAlias(links[0]);
			else
				netList += gateName(item,"X");
			netList+=',';
			var links=item.linksInto();
			if( links.length )
				netList += getNameOrAlias(links[0]);
			else
				netList += '1\'bx';
			netList+=");";
			break; 
		case "and":
		case "or":
		case "xor":
		case "nand":
		case "nor":
		case "xnor":
			netList += "\n\n" + gateNames[style["shape"]] + ' ' + gateName(item,"U") + " ("; 
			var links=item.linksOutOf();
			if( links.length )
				netList += getNameOrAlias(links[0]);
			else
				netList += gateName(item,"X");
			netList+=',';
			var links=item.linksInto();
			if( links.length )
				links.forEach( function(link){ netList += getNameOrAlias(link) + ', ';});
			else
				netList += '1\'bx,';
			netList=netList.replace(/, *$/gi, '');
			netList=netList+");";
			break; 
		default: 
			netList += "\n\n" + gateNames[style["shape"]] + ' ' + gateName(item,"C") + " ("; 
			var links=item.linksOutOf();
			if( links.length )
				netList += getNameOrAlias(links[0]);
			else
				netList += gateName(item,"X");
			netList+=',';
			var links=item.linksInto();
			if( links.length )
				links.forEach( function(link){ netList += getNameOrAlias(link) + ', ';});
			else
				netList += '1\'bx,';
			netList=netList.replace(/, *$/gi, '');
			netList=netList+");";
			break; 
		}
	});

	verilogCode="module ";
	verilogCode+=(moduleName!=="")?moduleName:"mymodule";
	verilogCode+= "(" ;
	//inputSet.forEach( function(item){ inputList+="\n\tinput " + item + ',';});
	if( inputList != '' || outputList != '')
	{
		verilogCode += inputList;
		verilogCode += outputList;
		verilogCode=verilogCode.replace(/, *$/gi, '');
	}
	verilogCode+="\n);";
	wireSet.forEach( function(item){ wireList += item + ", "; } );
	if( wireList != "" )
	{
		wireList=wireList.replace(/, *$/gi, '');
		verilogCode+="\n\nwire "+wireList+";";
	}
	if( assignList != '' )
		verilogCode+="\n"+assignList;
	if( netList != '' )
		verilogCode+="\n"+netList;
	verilogCode+="\n\nendmodule\n";
	return verilogCode;
};

schematic.prototype.overlay_led_on = new mxCellOverlay(new mxImage('images/led_on.png',20,40), 'Output is high',mxConstants.ALIGN_RIGHT,mxConstants.ALIGN_MIDDLE);

schematic.prototype.overlay_led_off = new mxCellOverlay(new mxImage('images/led_off.png',20,40), 'Output is low',mxConstants.ALIGN_RIGHT,mxConstants.ALIGN_MIDDLE);
schematic.prototype.overlay_sw_on = new mxCellOverlay(new mxImage('images/switchon.png',20,40), 'Click to turn off',mxConstants.ALIGN_LEFT,mxConstants.ALIGN_MIDDLE);

schematic.prototype.overlay_sw_off = new mxCellOverlay(new mxImage('images/switchoff.png',20,40), 'Click to turn on',mxConstants.ALIGN_LEFT,mxConstants.ALIGN_MIDDLE);





schematic.prototype.overlay_sw_off.addListener(mxEvent.CLICK, function(sender, evt)
{
	var cell=evt.getProperty("cell");
	this.graph.removeCellOverlays(cell);
	this.graph.addCellOverlay(cell, schematic.prototype.overlay_sw_on);



});
schematic.prototype.overlay_sw_on.addListener(mxEvent.CLICK, function(sender, evt)
{
	var cell=evt.getProperty("cell");
	this.graph.removeCellOverlays(cell);
	this.graph.addCellOverlay(cell, schematic.prototype.overlay_sw_off);



});
schematic.prototype.linkIsHigh=function( link ){


	var style=this.graph.getCellStyle(link);
	return style[mxConstants.STYLE_STROKECOLOR] == 'green';
};
schematic.prototype.setGateOutput=function( cell, logic, outname="out" ){
	if( logic)
	{
		this.graph.setCellStyles(mxConstants.STYLE_STROKECOLOR,'green',[cell]);
		this.graph.setCellStyles(mxConstants.STYLE_STROKECOLOR,'green',cell.getLinks(outname,true));
	}
	else
	{
		this.graph.setCellStyles(mxConstants.STYLE_STROKECOLOR,'black',[cell]);
		this.graph.setCellStyles(mxConstants.STYLE_STROKECOLOR,'black',cell.getLinks(outname,true));
	}
};
schematic.prototype.updateGateOutput=function(node)
{
	var ckt=this;
	var graph=ckt.graph;
	var style=graph.getCellStyle(node);
	var sel=0;
	switch( style["shape"] )
	{
	case "inputport":
		overlay=this.graph.getCellOverlays(node);
		if (overlay && ( overlay[0]==schematic.prototype.overlay_sw_on ))
			ckt.setGateOutput(node,true);
		else
			ckt.setGateOutput(node,false);
		break;
	case "outputport":
		var links=node.linksInto();
		if( links.length )
		{
			if( ckt.linkIsHigh(links[0]))
			{
				graph.removeCellOverlays(node);
				graph.addCellOverlay(node, ckt.overlay_led_on);
				ckt.setGateOutput(node,true);
			}
			else
			{
				graph.removeCellOverlays(node);
				graph.addCellOverlay(node, ckt.overlay_led_off);
				ckt.setGateOutput(node,false);
			}
		}
		break;
	case "constant0":
		ckt.setGateOutput(node,false);
		break;
	case "constant1":
		ckt.setGateOutput(node,true);
		break;

	case "and":
	case "buffer":
		var links=node.linksInto();
		if( links.length )
			ckt.setGateOutput(node, links.every(function(link){ return ckt.linkIsHigh(link);} ));
		break;
	case "inverter":
	case "nand":
		var links=node.linksInto();
		if( links.length )
			ckt.setGateOutput(node, !links.every(function(link){ return ckt.linkIsHigh(link);} ));
		break;
	case "or":
		var links=node.linksInto();
		if( links.length )
			ckt.setGateOutput(node, links.some(function(link){ return ckt.linkIsHigh(link);} ));
		break;
	case "nor":
		var links=node.linksInto();
		if( links.length )
			ckt.setGateOutput(node, !links.some(function(link){ return ckt.linkIsHigh(link);} ));
		break;
	case "xor":
		var links=node.linksInto();
		var count=0;
		if( links.length )
			links.forEach(function(link){ count=count+(ckt.linkIsHigh(link)?1:0);} );
		ckt.setGateOutput(node,count%2 );
		break;
	case "xnor":
		var links=node.linksInto();
		var count=0;
		if( links.length )
			links.forEach(function(link){ count=count+(ckt.linkIsHigh(link)?1:0);} );
		ckt.setGateOutput(node,(1+count)%2 );
		break;
		/*
	case "mux16":
		sel+= ckt.linkIsHigh(node.getLink("in_s3")) ? 8 : 0;
	case "mux8":
		sel+= ckt.linkIsHigh(node.getLink("in_s2")) ? 4 : 0;
	case "mux4":
		sel+= ckt.linkIsHigh(node.getLink("in_s1")) ? 2 : 0;
	case "mux2":
		sel+= ckt.linkIsHigh(node.getLink("in_s0")) ? 1 : 0;
		ckt.setGateOutput( node,ckt.linkIsHigh( node.getLink("in_i"+sel+"_")));
		break;
	case "decoder4":
		sel+= ckt.linkIsHigh(node.getLink("in_a3")) ? 8 : 0;
	case "decoder3":
		sel+= ckt.linkIsHigh(node.getLink("in_a2")) ? 4 : 0;
	case "decoder2":
		sel+= ckt.linkIsHigh(node.getLink("in_a1")) ? 2 : 0;
		sel+= ckt.linkIsHigh(node.getLink("in_a0")) ? 1 : 0;
		ckt.setGateOutput( node,false);
		ckt.setGateOutput( node,ckt.linkIsHigh( node.getLink("in_en")),"out"+(sel+1));
	case "srlatch_en":
		if( !ckt.linkIsHigh(node.getLink("in_en")))
			break;
	case "srlatch":
		if( ckt.linkIsHigh(node.getLink("in_S")))
			ckt.setGateOutput( node,true);
		else if( ckt.linkIsHigh(node.getLink("in_R")))
			ckt.setGateOutput( node,false);
		break;
	case "dlatch_en":
		if( !ckt.linkIsHigh(node.getLink("in_en")))
			break;
	case "dlatch":
		if( ckt.linkIsHigh(node.getLink("in_G")))
			ckt.setGateOutput( node,ckt.linkIsHigh( node.getLink("in_D")),);
		break;
	case "dff_en":
		if( !ckt.linkIsHigh(node.getLink("in_en")))
			break;
	case "dff":
		if( !node.clkLast && ckt.linkIsHigh(node.getLink("in_>")))
			ckt.setGateOutput( node,ckt.linkIsHigh( node.getLink("in_D")));
		node.clkLast = ckt.linkIsHigh( node.getLink("in_>")) ;
		break;
		*/
	default:
	//------- never tested
		sel+= ckt.linkIsHigh(node.getLink("in_a1")) ? 2 : 0;
		sel+= ckt.linkIsHigh(node.getLink("in_a0")) ? 1 : 0;
		ckt.setGateOutput( node,false);
		ckt.setGateOutput( node,ckt.linkIsHigh( node.getLink("in_en")),"out"+(sel+1));
		break;
	//-------
	}
};
