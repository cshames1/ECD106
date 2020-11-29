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
		var decoder_size=2;
		var fanout_size=2;
		var fanin_size=2;
		var fan_in=2;
			var style=graph.getCellStyle(item);
		switch( style["shape"] )
		{
		//====================================================================================
		//	MISC GROUP
		//====================================================================================
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
		//====================================================================================
		//	BASIC GATE GROUP
		//====================================================================================
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
		//====================================================================================
		//	MUX GROUP
		//====================================================================================
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
		//====================================================================================
		//	DECODER GROUP
		//====================================================================================
		case "decoder4":decoder_size++;
		case "decoder3":decoder_size++;
		case "decoder2":
			if( item.getLinks("in_a",false).length != decoder_size)
				Messages.addError("All Decoder address inputs must be connected",item);
			if( item.getLinks("in_en",false).length != 1)
				Messages.addError("Decoder enable input must be connected",item);
			for( var i=0; i<(1<<decoder_size); i=i+1 )
			{
				if( item.getLinks("out_"+(i+1)+"_",true).length == 0)
				{
					Messages.addWarning("Decoder has an unconnected data output(s)",item);
					break;
				}
			}
			break;
		//====================================================================================
		//	LATCH GROUP
		//====================================================================================
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
		//====================================================================================
		//	BUS GROUP
		//====================================================================================
		
		// -Warning if not all outputs are connected
		// Warning if input is not the bus size of the fanout****
		// -Error if input is not connected
		// -Error if no outputs are connected
		// Error if output is not a 1-bit wire**** (does this matter?)
		case "fanOut32":	fanout_size += 16;
		case "fanOut16":	fanout_size += 8;
		case "fanOut8":		fanout_size += 4;
		case "fanOut4":		fanout_size += 2;
		case "fanOut2":
			if ( item.numLinksInto() == 0)
				Messages.addError("Fan out input is unconnected",item);

			if( item.numLinksOutOf() == 0 )
				Messages.addError("Fan out has no connected outputs",item);
			else if( item.numLinksOutOf() != fanout_size)
				Messages.addWarning("Fan out has " + (fanout_size-item.numLinksOutOf()) + " unconnected outputs",item);
			break;

		// -Warning if not all inputs are connected
		// Warning if output is not the bus size of the fanin**** (does this matter?)
		// -Error if output is not connected
		// -Error if no inputs are connected
		// Error if input is not a 1-bit wire****
		case "fanIn32":	fanin_size += 16;
		case "fanIn16":	fanin_size += 8;
		case "fanIn8":	fanin_size += 4;
		case "fanIn4":	fanin_size += 2;
		case "fanIn2":
			if ( item.numLinksOutOf() == 0)
				Messages.addError("Fan in output is unconnected",item);

			if( item.numLinksInto() == 0 )
				Messages.addError("Fan in has no connected inputs",item);
			else if( item.numLinksInto() != fanin_size)
				Messages.addWarning("Fan in has " + (fanin_size-item.numLinksInto()) + " unconnected inputs",item);
			break;
		}
	},this);

	if( numOutputs===0 )
		Messages.addError("Schematic must have at least one connected output",null);
	if( numInputs===0 )
		Messages.addWarning("Schematic has unconnected inputs",null);
	return Messages;
};

schematic.prototype.getImportedComponentVerilog=function( module ){
	function getModuleVerilog( module ) {
		var storedShapes = JSON.parse(localStorage.getItem('storedShapes'));
		var currentModule;
		if ( storedShapes ) storedShapes.forEach(function(shape){
			if (shape.componentName==module) currentModule = shape;
		});
		return currentModule.verilogCode;
	}
	var importedVerilog = getModuleVerilog( module );
	var lines = importedVerilog.split(/\n/g);
	var newVerilog="module "+module+" (\n";
	for (var i=1; i<lines.length; i++) {
		newVerilog += lines[i] + '\n';
	}
	return newVerilog;
}

schematic.prototype.getUsedImportedComponents=function(){
	var native_components=["and", "nand", "or","nor","xor","xnor","buf", "not",
					"mux2","mux4", "mux8","mux16",
					"decoder #(2,1)","decoder #(3,1)","decoder #(4,1)",
					"register_en",
					"fanIn2",  "fanIn4",  "fanIn8",  "fanIn16",  "fanIn32",
					"fanOut2",  "fanOut4", "fanOut8", "fanOut16", "fanOut32" ];
	var graph=this.graph;
	nodes=graph.getChildVertices(graph.getDefaultParent());
	var components = new Set();
	if( nodes ) nodes.forEach(function(item){
		var style=graph.getCellStyle(item); 
		var module = style["shape"];
		if ( !native_components.includes( module ) ) 
			components.add( module );
	});
	return components;
}

schematic.prototype.createVerilog=function()
{
	var netList="";
	var inputList="";
	var inputSet=new Set();
	var outputAssignList="";
	var wireAssignList="";
	var wireList = new Object();
	var wireSet = new Object();
	for (var i=0; i<=5; i++) {
		wireList[(1<<i)] = "";
		wireSet[(1<<i)] = new Set();
	}
	var outputList="";
	var netAliases={};
	var verilogCode="";
	var graph=this.graph;
	var gateNames={and:"and", nand:"nand",or:"or",nor:"nor",xor:"xor",xnor:"xnor",buffer:"buf", inverter:"not",
					mux2:"mux2", mux4:"mux4", mux8:"mux8", mux16:"mux16",
					decoder2:"decoder #(2,1)",decoder3:"decoder #(3,1)",decoder4:"decoder #(4,1)",
					dlatch:"d_latch",dlatch_en:"d_latch_en",register_en:"register_en",srlatch:"sr_latch",srlatch_en:"sr_latch_en",
					fanIn2: "fanIn2", fanIn4: "fanIn4", fanIn8: "fanIn8", fanIn16: "fanIn16", fanIn32: "fanIn32",
					fanOut2: "fanOut2", fanOut4: "fanOut4", fanOut8: "fanOut8", fanOut16: "fanOut16", fanOut32: "fanOut32" 
				};
	function gateName( node, prefix){ 
		return prefix+node.id;
	}
	function portName( node, prefix ){ 
		return node.value ? node.value : gateName(node,prefix);
	}
	function netName( link ){
		var port_id = getSrcPortID( link );
		if( port_id == "" )
			return 'X'+link.source.id;
		else
			return 'X'+link.source.id + '_'+ port_id;
	}
	function srcNodeIs(link, moduleName){
		return getModule(link.source).includes(moduleName);
	}
	function trgtNodeIs(link, moduleName){
		return getModule(link.target).includes(moduleName);
	}
	function getNameOrAlias( link ){
		var alias = "";
		var try_inputport_name = netAliases[netName(link)] ;
		if ( srcNodeIs(link, "fanOut") ) {
			var src_node = link.source;
			var srclnk = src_node.getLink( 'in',false);
			if (srclnk) {
				var try_bus_name = netAliases[netName(srclnk)];
				if (try_bus_name) 
					alias += try_bus_name+'['+getSrcPortID(link)+']';
				else 
					alias += netName(srclnk)+"["+getSrcPortID(link)+"]";
			}
			else
				alias = "1b'x";
		}
		else if ( try_inputport_name )
			alias += try_inputport_name;
		else if (netName(link))
			alias += netName(link);
		return alias;
	}
	function getSrcPortID ( link ) {
		return /sourcePort=out([^_]*)/.exec(link.style)[1];
	}
	function getTrgtPortID ( link ) {
		return /targetPort=in([^_]*)/.exec(link.style)[1];
	}
	function searchStoredShapesFor( moduleName ){
		var stored_shapes = JSON.parse(localStorage.getItem('storedShapes'));
		var i = stored_shapes.length;
		while( i-- ){
			if ( stored_shapes[i].componentName==moduleName )
				return stored_shapes[i];
		}
	}
	function getModulePortSizes ( moduleName ) {
		return searchStoredShapesFor( moduleName ).signal_size;
	}
	function getModulePorts ( moduleName ){
		return searchStoredShapesFor( moduleName ).signals;
	}
	function getModule( node ){
		return graph.getCellStyle( node )["shape"];
	}
	function sortNodes ( unsorted_nodes ) {
		var sorted_nodes = new Set();
		if ( unsorted_nodes) unsorted_nodes.forEach(function(node){
			var module = getModule( node );
			if ( module.includes("inputport") || !(module in gateNames) || module.includes("fanIn") )
				sorted_nodes.add( node );
		});
		if ( unsorted_nodes) unsorted_nodes.forEach(function(node){
			var module = getModule( node );
			if ( !module.includes("inputport") && (module in gateNames) && !module.includes("fanIn") )
				sorted_nodes.add( node );
		});
		return sorted_nodes;
	}
	function setCellStyleAttribute( cell, attribute, value ){
		var new_style ="";
		var style = cell["style"];
		if ( style.includes(attribute) ) {
			style_array = style.split(";");
			style_array.forEach(function(token){
				if ( token.includes(attribute) )
					new_style += attribute+"="+value+";";
				else if (token)
					new_style += token+";";
			});
		}
		else
			new_style += style+attribute+"="+value+";";
		cell["style"] = new_style;
	}
	function setLinkSetSize(link_set, size){
		if ( link_set ) link_set.forEach(function(link){
			link.size = size;
			setCellStyleAttribute( link, "strokeWidth", Math.log2(size)+1 );
		});
	}
	nodes = sortNodes( graph.getChildVertices(graph.getDefaultParent()) );

	//name the nets
	if( nodes ) nodes.forEach(function(node){
		var module = getModule(node);
		switch( module )
		{
			case "inputport1": 
			case "inputport2": 
			case "inputport4": 
			case "inputport8": 
			case "inputport16": 
			case "inputport32": 
				var links=node.linksOutOf();
				if( node.value && links.length )
					netAliases[netName(links[0])] = node.value;
				else if( links.length )
					netAliases[netName(links[0])] = portName(node,"I");
				break;
			case "constant0": 
				var links=node.linksOutOf();
				if( node.value && links.length )
					links.forEach( function( link ){
					netAliases[netName(link)] = '1\'b0';});
				break;
			case "constant1": 
				var links=node.linksOutOf();
				if( node.value && links.length )
					links.forEach( function( link ){
					netAliases[netName(link)] = '1\'b1';});
				break;
		}
	});
	//map the netlist
	if( nodes ) nodes.forEach(function(node){
		var decoder_size=1;
		var fanout_size=0;
		var fanin_size=0;
		var mux_size=0;
		var inputport_size=0;
		var module = getModule( node );
		switch( module )
		{
		case "inputport32": inputport_size++;
		case "inputport16": inputport_size++;
		case "inputport8": inputport_size++;
		case "inputport4": inputport_size++;
		case "inputport2": inputport_size++;
		case "inputport1":
			var linksout=node.linksOutOf();
			setLinkSetSize(linksout, (1<<inputport_size));
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
			var linksout=node.linksOutOf();
			setLinkSetSize(linksout, 1);
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
			var linksout=node.linksOutOf();
			if( linksout.length == 1 && trgtNodeIs(linksout[0], "outputport") )
				netAliases[netName(linksout[0])] = portName(linksout[0].target,"O");
			//else add net name to wire list
			else if( linksout.length ) {
				wireSet[(1<<0)].add(netName(linksout[0],"X"));
			}
			else
				wireSet[(1<<0)].add(gateName(node,"X") );
			setLinkSetSize(linksout, 1);
			break;
		case "register_en":
			var output_size=1;
			var input = node.getLinks('in_D',false);
			if(input[0] && input[0].size) 
				output_size = input[0].size;
			//determine if output net name is port name
			var linksout=node.linksOutOf();
			if( linksout.length == 1 && trgtNodeIs(linksout[0], "outputport") ) 
				netAliases[netName(linksout[0])] = portName(linksout[0].target,"O");
			//else add net name to wire list
			else if( linksout.length ) 
				wireSet[output_size].add(netName(linksout[0],"X"));
			setLinkSetSize(linksout, output_size);
			break;
		case "mux16": mux_size++;
		case "mux8": mux_size++;
		case "mux4": mux_size++;
		case "mux2": mux_size++;
			//find the width of the largest connected wire, and make the output that width
			var output_size=1;
			for (var i=0; i<(1<<mux_size); i++) {
				var linkin = node.getLink('in'+i, false);
				if (linkin && linkin.size>output_size) 
					output_size=linkin.size;
			}
			//determine if output net name is port name
			var linksout=node.linksOutOf();
			if( linksout.length == 1 && trgtNodeIs(linksout[0], "outputport") ) 
				netAliases[netName(linksout[0])] = portName(linksout[0].target,"O");
			//else add net name to wire list
			else if( linksout.length ) 
				wireSet[output_size].add(netName(linksout[0],"X"));
			else
				wireSet[output_size].add(gateName(node,"X") );
			setLinkSetSize(linksout, output_size);
			break;
		case "decoder4":decoder_size++;
		case "decoder3":decoder_size++;
		case "decoder2":decoder_size++;
			for( var i=0; i<(1<<decoder_size); i=i+1 )
			{
				var linksout=node.getLinks( 'out'+ i +'_d', true);
				if( linksout.length == 1 && trgtNodeIs(linksout[0], "outputport") ) 
					netAliases[netName(linksout[0])] = portName(linksout[0].target,"O");
				else if( linksout.length )
					wireSet[(1<<0)].add(netName(linksout[0],"X"));
				setLinkSetSize(linksout, 1);
			}
			break;
		case "fanOut32": fanout_size++;
		case "fanOut16": fanout_size++;
		case "fanOut8": fanout_size++;
		case "fanOut4": fanout_size++;
		case "fanOut2": fanout_size++;
			for( var i=0; i<(1<<fanout_size); i=i+1 )
			{
				var linksout=node.getLinks( 'out'+ i + '_', true);
				if( linksout.length == 1 && trgtNodeIs(linksout[0], "outputport") ) 
					netAliases[netName(linksout[0])] = portName(linksout[0].target,"O");
				setLinkSetSize(linksout, 1);
			}
			break;
		case "fanIn32": fanin_size++;
		case "fanIn16": fanin_size++;
		case "fanIn8": fanin_size++;
		case "fanIn4": fanin_size++;
		case "fanIn2": fanin_size++;
			//determine if output net name is port name
			var linksout=node.linksOutOf();
			if( linksout.length == 1 && trgtNodeIs(linksout[0], "outputport") ) 
				netAliases[netName(linksout[0])] = portName(linksout[0].target,"O");
			setLinkSetSize(linksout, (1<<fanin_size));
			break;
		default:
			var portSizes = getModulePortSizes(module);
			var linksout=node.linksOutOf();
			var outputs = new Set();
			//find each output being used
			linksout.forEach(function(link){
				outputs.add( getSrcPortID(link) );
			});
			//for each used output, map the net
			outputs.forEach(function(id){
				var linksout=node.getLinks( 'out' + id + '_', true);
				if( linksout.length == 1 && trgtNodeIs(linksout[0], "outputport") ) 
					netAliases[netName(linksout[0])] = portName(linksout[0].target,"O");
				if( linksout.length ) 
					wireSet[portSizes.output[id]].add(netName(linksout[0],"X"));
				setLinkSetSize(linksout, portSizes.output[id]);					
			});
			break;
		}
	});
	//create Verilog
	if( nodes )
	nodes.forEach(function(node){
		var mux_size=0;
		var fanin_size = 0;
		var inputport_size=0;
		var outputport_size=0;
		var decoder_size=1;
		var module = getModule(node);
		switch( module )
		{
		case "constant0":
		case "constant1":
			break;
		case "inputport32": inputport_size++;
		case "inputport16": inputport_size++;
		case "inputport8": inputport_size++;
		case "inputport4": inputport_size++;
		case "inputport2": inputport_size++;
		case "inputport1":
			if (inputport_size==0) 
				inputList+="\n\tinput " + portName(node,'I') +',';
			else
				inputList+="\n\tinput [" + ((1<<inputport_size)-1) + ':0] ' + portName(node,'I') +',';
			inputSet.add( portName(node,'I') );
			break;
		case "outputport32": outputport_size++;
		case "outputport16": outputport_size++;
		case "outputport8": outputport_size++;
		case "outputport4": outputport_size++;
		case "outputport2": outputport_size++;
		case "outputport1":
			if (outputport_size==0)
				outputList+="\n\toutput " + portName(node,'O') + ',';
			else
				outputList+="\n\toutput [" + ((1<<outputport_size)-1) + ':0] ' + portName(node,'O') +',';
			var link=node.linksInto();
			if( link.length == 0 )
				outputAssignList += "\nassign " + portName(node,"O") + " = 1\'bx;" ;
			else if( getNameOrAlias( link[0]) != portName(node,"O")) 
			{
				outputAssignList += "\nassign " + portName(node,"O") + " = " ;
				outputAssignList += getNameOrAlias( link[0])  + ";";
			}
			break;
		case "inverter":
		case "buffer":
			netList += "\n\n" + gateNames[module] + ' ' + gateName(node,"U") + " ("; 
			var links=node.linksOutOf();
			if( links.length )
				netList += getNameOrAlias( links[0]);
			else
				netList += gateName(node,"X");
			netList+=',';
			var links=node.linksInto();
			if( links.length )
				netList += getNameOrAlias( links[0]);
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
			netList += "\n\n" + gateNames[module] + ' ' + gateName(node,"U") + " ("; 
			var links=node.linksOutOf();
			if( links.length )
				netList += getNameOrAlias( links[0]);
			else
				netList += gateName(node,"X");
			netList+=',';
			var links=node.linksInto();
			if( links.length )
				links.forEach( function(link){ netList += getNameOrAlias( link) + ', ';});
			else
				netList += '1\'bx,';
			netList=netList.replace(/, *$/gi, '');
			netList=netList+");";
			break; 
		case "mux16": mux_size++;
		case "mux8": mux_size++;
		case "mux4": mux_size++;
		case "mux2": mux_size++;
			var output_size=1;
			for( var i=0; i<(1<<mux_size); i++ )
			{
				var linki = node.getLink( 'in'+i,false);
				if (linki && linki.size>output_size)
					output_size = linki.size;
			}
			netList += "\n\n" + gateNames[module] + ' #(' + output_size +') '+gateName(node,"U") + " ("; 
			netList=netList+"\n\t";
			for( var i=0; i<(1<<mux_size); i++ )
			{
				var linki = node.getLink( 'in'+i,false);
				if( linki ) 
					netList += '.i' + i + '(' + getNameOrAlias( linki) + '), ';
			}
			netList += '\n\t.sel( {';
			for( var i=mux_size-1; i>=0; i=i-1 )
			{
				var lnk=node.getLink( 'sel'+i,false);
				if( lnk ) 
					netList+=getNameOrAlias( lnk);
				else 
					netList+='1\'bx';
				netList+=',';
			}
			netList=netList.replace(/, *$/gi, '');
			netList += '}),\n\t.q(';
			var links=node.linksOutOf();
			if( links.length )
				netList += getNameOrAlias( links[0]);
			else
				netList += gateName(node,"X");
			netList += ')\n);';
			break; 
		case "register_en":
			var linkin=node.getLink( 'in_D_',false);
			var output_size = (linkin)? linkin.size : 1;
			netList += '\n\n' + gateNames[module] + ' #(' + output_size + ')' +  ' ' + gateName(node,'U') + ' ('; 
			if( linkin )
				netList += '\n\t.data_in(' + getNameOrAlias( linkin) + '),';
			var linkclk=node.getLink( 'in_clk_',false);
			if( linkclk )
				netList += '\n\t.clk_in(' + getNameOrAlias( linkclk) + '),';
			var linken=node.getLink( 'in_en_',false);
			if( linken ) 
				netList += '\n\t.en_in(' + getNameOrAlias( linken) + '),';
			var linkq=node.linksOutOf();
			if( linkq.length )
				netList += '\n\t.q('+getNameOrAlias( linkq[0]) + ")";
			netList=netList+"\n);";
			break;
		case "decoder4": decoder_size++;
		case "decoder3": decoder_size++;
		case "decoder2": decoder_size++;
			netList += "\n\n" + gateNames[module] + ' ' + gateName(node,"U") + " ("; 
			netList += '\n\t.data_out( {';
			for( var i=(1<<decoder_size)-1; i>=0; i=i-1 )
			{
				var lnk=node.getLink( 'out'+(i)+'_d'+i,true);
				if( lnk ) 
					netList+=getNameOrAlias( lnk);
				else 
					netList+='1\'bx';
				netList+=', ';
			}
			netList=netList.replace(/, *$/gi, '');
			netList = netList+ '} ),\n\t.address_in( {';
			for( var i=decoder_size-1; i>=0; i=i-1 )
			{
				var lnk=node.getLink( 'in'+i,false);
				if( lnk ) 
					netList+=getNameOrAlias( lnk);
				else 
					netList+='1\'bx';
				netList+=', ';
			}
			netList=netList.replace(/, *$/gi, '');
			netList=netList+"} ),\n\t.en_in( ";
			var lnk=node.getLink( 'in_en',false);
				if( lnk ) netList+=getNameOrAlias( lnk);
				else netList+='1\'bx';
			netList+=")\n);";
			break; 
		case "fanOut32": 
		case "fanOut16": 
		case "fanOut8": 
		case "fanOut4": 
		case "fanOut2": 
			break; 
		case "fanIn32": fanin_size++;
		case "fanIn16": fanin_size++;
		case "fanIn8": fanin_size++;
		case "fanIn4": fanin_size++;
		case "fanIn2": fanin_size++;
			var assignment = "";
			var links=node.linksOutOf();
			if(links.length == 1 && trgtNodeIs(links[0], "outputport") ) 
				assignment += "assign "+getNameOrAlias( links[0]) +' = { ';
			else
				assignment += "wire ["+((1<<fanin_size)-1)+":0] "+gateName(node,"X")+" = { ";
			for( var i=(1<<fanin_size)-1; i>=0; i=i-1 )
			{
				var lnk=node.getLink( 'in'+i,false);
				if( lnk ) 
					assignment+=getNameOrAlias( lnk);
				else 
					assignment+='1\'bx';
				assignment+=', ';
			}
			assignment=assignment.replace(/, *$/gi, '');
			assignment=assignment+" };\n";
			if(links.length == 1 && trgtNodeIs(links[0], "outputport") ) 
				outputAssignList += assignment;
			else
				wireAssignList += assignment;
			break; 
		default: 
			var ports = getModulePorts(module);
			netList += "\n\n" + module + ' ' + gateName(node,"C") + " (";
			var links=node.linksInto();
			if( links.length ) links.forEach( function(link){ 
				var id = getTrgtPortID(link);
				netList += ("\n\t." + ports.input[id] + "(" + getNameOrAlias( link) + '),');
			});
			var links=node.linksOutOf();
			if( links.length ) links.forEach( function(link){ 
				var id = getSrcPortID(link);
				var portInstantiation = "\n\t." + ports.output[id] + "(" + getNameOrAlias( link) + '),' 
				if (!netList.includes(portInstantiation)) 
					netList += portInstantiation;
			});
			netList=netList.replace(/, *$/gi, '');
			netList=netList+"\n);";
			break;
		}
	});

	verilogCode="module top (";
	if( inputList != '' || outputList != '')
	{
		verilogCode += inputList;
		verilogCode += outputList;
		verilogCode=verilogCode.replace(/, *$/gi, '');
	}
	verilogCode+="\n);\n\n";
	//Print busses
	for (var i=5; i>=1; i--) {
		wireSet[(1<<i)].forEach( function(wire){ wireList[(1<<i)] += wire + ", "; } );
		if( wireList[(1<<i)] != "" )
		{
			wireList[(1<<i)]=wireList[(1<<i)].replace(/, *$/gi, '');
			verilogCode+="wire [" + ((1<<i)-1) + ":0] "+wireList[(1<<i)]+";\n";
		}
	}
	//Print 1-bit Wires
	wireSet[(1<<0)].forEach( function(wire){ wireList[(1<<0)] += wire + ", "; } );
	if( wireList[(1<<0)] != "" )
	{
		wireList[(1<<0)]=wireList[(1<<0)].replace(/, *$/gi, '');
		verilogCode+="wire "+wireList[(1<<0)]+";\n";
	}
	if( wireAssignList != "" )
		verilogCode+=wireAssignList;
	if( outputAssignList != "" )
		verilogCode+=outputAssignList;
	if( netList != '' )
		verilogCode+=netList;
	verilogCode+="\n\nendmodule\n";

	graph.refresh();
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
	case "register_en":
		if( !ckt.linkIsHigh(node.getLink("in_en")))
			break;
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
