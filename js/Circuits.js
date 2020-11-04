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
		var mux_size=1;
		var decodersize=2
		var fan_in=2;
			var style=graph.getCellStyle(item);
		switch( style["shape"] )
		{
		case "constant0":
		case "constant1":
			break;
		case "outputport1":
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
		case "inputport1":
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
		case "mux16":mux_size++;
		case "mux8":mux_size++;
		case "mux4":mux_size++;
		case "mux2":
			if( item.getLinks("in_s",false).length != mux_size)
				Messages.addError("All MUX \"select\" input(s) must be connected",item);
			if( item.numLinksOutOf() == 0 )
				Messages.addWarning("MUX has an unconnected output",item);
			if( item.getLinks("in_i",false).length != (1<<mux_size))
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
		case "register_en":
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


schematic.prototype.createVerilog=function(name)
{
	var teststr = "";
	var netList="";
	var inputList="";
	var inputSet=new Set();
	var assignList="";
	var wireList = new Object();
	var wireSet = new Array();
	for (var i=0; i<=5; i++) {
		wireList[(1<<i)] = "";
		wireSet[(1<<i)] = new Set();
	}
	var outputList="";
	var netAliases={};
	var gateInputs={};
	var moduleName= name;
	var verilogCode="";
	var graph=this.graph;
	var gateNames={and:"and", nand:"nand",or:"or",nor:"nor",xor:"xor",xnor:"xnor",buffer:"buf", inverter:"not",
					mux2:"mux2", mux4:"mux4", mux8:"mux8", mux16:"mux16",
					decoder2:"decoder #(2,1)",decoder3:"decoder #(3,1)",decoder4:"decoder #(4,1)",
					dlatch:"d_latch",dlatch_en:"d_latch_en",register:"register",register_en:"register_en",srlatch:"sr_latch",srlatch_en:"sr_latch_en",
					busencoder2: "busencoder2", busencoder4: "busencoder4", busencoder8: "busencoder8", busencoder16: "busencoder16", busencoder32: "busencoder32",
					busdecoder2: "busdecoder2", busdecoder4: "busdecoder4", busdecoder8: "busdecoder8", busdecoder16: "busdecoder16", busdecoder32: "busdecoder32" 
				};
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
	function getSrcPortID ( link ) {
		var oPortName=/sourcePort=out([^_]*)/.exec(link.style);
		return oPortName[1];
	}
	function getTrgtPortID ( link ) {
		var oPortName=/targetPort=in([^_]*)/.exec(link.style);
		return oPortName[1];
	}
	function getModulePortSizes (moduleName) {
		var storedShapes = JSON.parse(localStorage.getItem('storedShapes'));
		var currentModule;
		storedShapes.forEach(function(shape){
			if (shape.componentName==moduleName) currentModule = shape;
		});
		return currentModule.signal_size;
	}
	function getModulePorts (moduleName){
		var storedShapes = JSON.parse(localStorage.getItem('storedShapes'));
		var currentModule;
		storedShapes.forEach(function(shape){
			if (shape.componentName==moduleName) currentModule = shape;
		});
		return currentModule.signals;
	}

	nodes=graph.getChildVertices(graph.getDefaultParent());
	
	//name the nets
	if( nodes ) nodes.forEach(function(item){
		var style=graph.getCellStyle(item); 
		var mux_size=0;
		var decodersize=1;
		var module = style["shape"];
		switch( module )
		{
			case "inputport1": 
			case "inputport2": 
			case "inputport4": 
			case "inputport8": 
			case "inputport16": 
			case "inputport32": 
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
		var decodersize=1;
		var bus_decoder_size=0;
		var bus_encoder_size=0;
		var mux_size=0;
		var input_size=0;
		var output_size=0;
		var style=graph.getCellStyle(item); 
		var module = style["shape"];
		switch( module )
		{
		case "inputport32": input_size++;
		case "inputport16": input_size++;
		case "inputport8": input_size++;
		case "inputport4": input_size++;
		case "inputport2": input_size++;
		case "inputport1":
			var links=item.linksOutOf();
			links.forEach(function(link){
				link.size = (1<<input_size);
			});
			break;
		case "outputport32":
		case "outputport16":
		case "outputport8":
		case "outputport4":
		case "outputport2":
		case "outputport1":
			break;
		case "constant0":
		case "constant1":
			break;
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
			if( linksout.length == 1 && graph.getCellStyle(linksout[0].target)["shape"].includes('outputport')) 
				netAliases[netName(linksout[0])] = portName(linksout[0].target,"O");
			//else add net name to wire list
			else if( linksout.length ) {
				wireSet[(1<<0)].add(netName(linksout[0],"X"));
				linksout.forEach(function(link){
					link.size=1;
				})
			}
			else
				wireSet[(1<<0)].add(gateName(item,"X") );
			break;
		case "register":
		case "register_en":
			var output_size=1;
			var input = item.getLinks('in_D',false);
			if(input.length) output_size = input[0].size;
			//determine if output net name is port name
			var linksout=item.linksOutOf();
			if( linksout.length == 1 && graph.getCellStyle(linksout[0].target)["shape"].includes('outputport')) 
				netAliases[netName(linksout[0])] = portName(linksout[0].target,"O");
			//else add net name to wire list
			else if( linksout.length ) {
				wireSet[output_size].add(netName(linksout[0],"X"));
				linksout.forEach(function(link){
					link.size=output_size;
				})
			}
			else
				wireSet[output_size].add(gateName(item,"X") );
			break;
		case "mux16": mux_size++;
		case "mux8": mux_size++;
		case "mux4": mux_size++;
		case "mux2": mux_size++;
			//find the width of the largest connected wire, and make the output that width
			var output_size=1;
			for (var i=0; i<(1<<mux_size); i++) {
				var linkin = item.getLink('i'+i, false);
				if (linkin && linkin.size>output_size) output_size=linkin.size;
			}
			//determine if output net name is port name
			var linksout=item.linksOutOf();
			if( linksout.length == 1 && graph.getCellStyle(linksout[0].target)["shape"].includes('outputport')) 
				netAliases[netName(linksout[0])] = portName(linksout[0].target,"O");
			//else add net name to wire list
			else if( linksout.length ) {
				wireSet[output_size].add(netName(linksout[0],"X"));
				linksout.forEach(function(link){
					link.size=output_size;
				});
			}
			else
				wireSet[output_size].add(gateName(item,"X") );
			break;
		case "decoder4":decodersize++;
		case "decoder3":decodersize++;
		case "decoder2":decodersize++;
			for( var i=0; i<(1<<decodersize); i=i+1 )
			{
				var linksout=item.getLinks( 'out'+ i +'_d', true);
				if( linksout.length == 1 && graph.getCellStyle(linksout[0].target)["shape"].includes('outputport'))
					netAliases[netName(linksout[0])] = portName(linksout[0].target,"O");
				else if( linksout.length )
					wireSet[(1<<0)].add(netName(linksout[0],"X"));
			}
			break;
		case "busdecoder32": bus_decoder_size++;
		case "busdecoder16": bus_decoder_size++;
		case "busdecoder8": bus_decoder_size++;
		case "busdecoder4": bus_decoder_size++;
		case "busdecoder2": bus_decoder_size++;
			for( var i=0; i<(1<<bus_decoder_size); i=i+1 )
			{
				var linksout=item.getLinks( 'out'+ i + '_', true);
				if( linksout.length == 1 && graph.getCellStyle(linksout[0].target)["shape"].includes('outputport'))
					netAliases[netName(linksout[0])] = portName(linksout[0].target,"O");
				else if( linksout.length ){
					wireSet[(1<<0)].add(netName(linksout[0],"X"));
					linksout[0].size=1;
				}
			}
			break;
		case "busencoder32": bus_encoder_size++;
		case "busencoder16": bus_encoder_size++;
		case "busencoder8": bus_encoder_size++;
		case "busencoder4": bus_encoder_size++;
		case "busencoder2": bus_encoder_size++;
			//determine if output net name is port name
			var linksout=item.linksOutOf();
			if( linksout.length == 1 && graph.getCellStyle(linksout[0].target)["shape"].includes('outputport')) 
				netAliases[netName(linksout[0])] = portName(linksout[0].target,"O");
			//else add net name to wire list
			else if( linksout.length ) {
				wireSet[(1<<bus_encoder_size)].add(netName(linksout[0],"X"));
				linksout.forEach(function(link){
					link.size=(1<<bus_encoder_size);
				});
			}
			else
				wireSet[(1<<bus_encoder_size)].add(gateName(item,"X") );
			break;
		default:
			var portSizes = getModulePortSizes(module);
			var linksout=item.linksOutOf();
			var outputs = new Set();
			//find each output being used
			linksout.forEach(function(link){
				outputs.add( getSrcPortID(link) );
			});
			//for each used output, map the net
			outputs.forEach(function(id){
				var linksout=item.getLinks( 'out' + id + '_', true);
				if( linksout.length == 1 && graph.getCellStyle(linksout[0].target)["shape"].includes('outputport'))
					netAliases[netName(linksout[0])] = portName(linksout[0].target,"O");
				else if( linksout.length ) {
					wireSet[portSizes.output[id]].add(netName(linksout[0],"X"));
					linksout[0].size=portSizes.output[id];
				}
			});
			break;
		}
	});
	//create Verilog
	if( nodes )
	nodes.forEach(function(item){
		var mux_size=0;
		var bus_encoder_size = 0;
		var bus_decoder_size = 0;
		var input_size=0;
		var output_size=0;
		var decodersize=1;
		var style=graph.getCellStyle(item); 
		var module = style["shape"];
		switch( module )
		{
		case "inputport32": input_size++;
		case "inputport16": input_size++;
		case "inputport8": input_size++;
		case "inputport4": input_size++;
		case "inputport2": input_size++;
		case "inputport1":
			if (input_size==0) 
				inputList+="\n\tinput " + portName(item,'I') +',';
			else
				inputList+="\n\tinput [" + ((1<<input_size)-1) + ':0] ' + portName(item,'I') +',';
			inputSet.add( portName(item,'I') );
			break;
		case "outputport32": output_size++;
		case "outputport16": output_size++;
		case "outputport8": output_size++;
		case "outputport4": output_size++;
		case "outputport2": output_size++;
		case "outputport1":
			if (output_size==0)
				outputList+="\n\toutput " + portName(item,'O') + ',';
			else
				outputList+="\n\toutput [" + ((1<<output_size)-1) + ':0] ' + portName(item,'O') +',';
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
		case "mux16": mux_size++;
		case "mux8": mux_size++;
		case "mux4": mux_size++;
		case "mux2": mux_size++;
			netList += "\n\n" + gateNames[style["shape"]] + ' #('+'32' +') '+gateName(item,"U") + " ("; 
			netList=netList+"\n\t";
			for( var i=0; i<(1<<mux_size); i++ )
			{
				netList += '.i'+i+'(';
				var lnk=item.getLink( 'i'+i,false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
				netList+='), ';
			}
			netList += '\n\t.sel( {';
			for( var i=mux_size-1; i>=0; i=i-1 )
			{
				var lnk=item.getLink( 'sel'+i,false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
				netList+=',';
			}
			netList=netList.replace(/, *$/gi, '');
			netList += '}),\n\t.q(';
			var links=item.linksOutOf();
			if( links.length )
				netList += getNameOrAlias(links[0]);
			else
				netList += gateName(item,"X");
			netList += ')\n);';
			break; 
		case "register":
			netList += "\n\n" + gateNames[style["shape"]] + ' #()' + ' ' + gateName(item,"U") + " ("; 
			netList += '\n\t.data_in(';
			{
				var lnk=item.getLink( 'in_D',false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
			}
			netList=netList+"),\n\t.clk_in(";
			{
				var lnk=item.getLink( 'in_clk',false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
			}
			netList += '),\n\t.q(';
			var links=item.linksOutOf();
			if( links.length )
				netList += getNameOrAlias(links[0]);
			else
				netList += gateName(item,"X");
			netList=netList+")\n);";
			break;
		case "register_en":
			netList += "\n\n" + gateNames[style["shape"]] + ' #()' +  ' ' + gateName(item,"U") + " ("; 
			netList += '\n\t.data_in(';
			{
				var lnk=item.getLink( 'in_D',false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
			}
			netList=netList+"),\n\t.clk_in(";
			{
				var lnk=item.getLink( 'in_clk',false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
			}
			netList=netList+"),\n\t.en_in(";
			{
				var lnk=item.getLink( 'in_en',false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
			}
			netList += '),\n\t.q(';
			var links=item.linksOutOf();
			if( links.length )
				netList += getNameOrAlias(links[0]);
			else
				netList += gateName(item,"X");
			netList=netList+")\n);";
			break;
		case "decoder4": decodersize++;
		case "decoder3": decodersize++;
		case "decoder2": decodersize++;
			netList += "\n\n" + gateNames[style["shape"]] + ' ' + gateName(item,"U") + " ("; 
			netList += '\n\t.data_out( {';
			for( var i=(1<<decodersize)-1; i>=0; i=i-1 )
			{
				var lnk=item.getLink( 'out'+(i)+'_d'+i,true);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
				netList+=',';
			}
			netList=netList.replace(/, *$/gi, '');
			netList = netList+ '} ),\n\t.address_in( {';
			for( var i=decodersize-1; i>=0; i=i-1 )
			{
				var lnk=item.getLink( 'in'+i,false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
				netList+=',';
			}
			netList=netList.replace(/, *$/gi, '');
			netList=netList+"} ),\n\t.en_in( ";
			var lnk=item.getLink( 'in_en',false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
			netList+=")\n);";
			break; 
		case "busdecoder32": bus_decoder_size++;
		case "busdecoder16": bus_decoder_size++;
		case "busdecoder8": bus_decoder_size++;
		case "busdecoder4": bus_decoder_size++;
		case "busdecoder2": bus_decoder_size++;
			netList += "\n\n" + gateNames[style["shape"]] + ' ' + gateName(item,"U") + " ("; 
			netList += '\n\t.bits_out( {';
			for( var i=(1<<bus_decoder_size)-1; i>=0; i=i-1 )
			{
				var lnk=item.getLink( 'out'+(i)+'_d'+i,true);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
				netList+=',';
			}
			netList=netList.replace(/, *$/gi, '');
			netList=netList+"} ),\n\t.bus_in( ";
			var lnk=item.getLink( 'in',false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
			netList+=")\n);";
			break; 
		case "busencoder32": bus_encoder_size++;
		case "busencoder16": bus_encoder_size++;
		case "busencoder8": bus_encoder_size++;
		case "busencoder4": bus_encoder_size++;
		case "busencoder2": bus_encoder_size++;
			netList += "\n\n" + gateNames[style["shape"]] + ' ' + gateName(item,"U") + " ("; 
			netList += '\n\t.bus_out(';
			var links=item.linksOutOf();
			if( links.length )
				netList += getNameOrAlias(links[0]);
			else
				netList += gateName(item,"X");
			netList=netList+"),\n\t.bits_in( {";
			for( var i=(1<<bus_encoder_size)-1; i>=0; i=i-1 )
			{
				var lnk=item.getLink( 'in'+i,false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
				netList+=',';
			}
			netList=netList.replace(/, *$/gi, '');
			netList=netList+"} )\n);";
			break; 
		default: 
			var ports = getModulePorts(module);
			netList += "\n\n" + module + ' ' + gateName(item,"C") + " (";
			var links=item.linksInto();
			if( links.length ) links.forEach( function(link){ 
				var id = getTrgtPortID(link);
				netList += ("\n\t." + ports.input[id] + "(" + getNameOrAlias(link) + '),');
			});
			var links=item.linksOutOf();
			if( links.length ) links.forEach( function(link){ 
				var id = getSrcPortID(link);
				var portInstantiation = "\n\t." + ports.output[id] + "(" + getNameOrAlias(link) + '),' 
				if (!netList.includes(portInstantiation)) 
					netList += (portInstantiation);
			});
			netList=netList.replace(/, *$/gi, '');
			netList=netList+"\n);";
			break;
		}
	});

	verilogCode="module ";
	verilogCode+=(moduleName!=="")?moduleName:"mymodule";
	verilogCode+= "(" ;
	if( inputList != '' || outputList != '')
	{
		verilogCode += inputList;
		verilogCode += outputList;
		verilogCode=verilogCode.replace(/, *$/gi, '');
	}
	verilogCode+="\n);";
	//Print busses
	for (var i=5; i>=1; i--) {
		wireSet[(1<<i)].forEach( function(item){ wireList[(1<<i)] += item + ", "; } );
		if( wireList[(1<<i)] != "" )
		{
			wireList[(1<<i)]=wireList[(1<<i)].replace(/, *$/gi, '');
			verilogCode+="\n\nwire [" + ((1<<i)-1) + ":0] "+wireList[(1<<i)]+";";
		}
	}
	//Print 1-bit Wires
	wireSet[(1<<0)].forEach( function(item){ wireList[(1<<0)] += item + ", "; } );
	if( wireList[(1<<0)] != "" )
	{
		wireList[(1<<0)]=wireList[(1<<0)].replace(/, *$/gi, '');
		verilogCode+="\n\nwire "+wireList[(1<<0)]+";";
	}
	if( assignList != '' )
		verilogCode+="\n"+assignList;
	if( netList != '' )
		verilogCode+="\n"+netList;
	verilogCode+="\n\nendmodule\n"+teststr;
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
	case "inputport1":
		overlay=this.graph.getCellOverlays(node);
		if (overlay && ( overlay[0]==schematic.prototype.overlay_sw_on ))
			ckt.setGateOutput(node,true);
		else
			ckt.setGateOutput(node,false);
		break;
	case "outputport1":
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
	case "register_en":
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
