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
		return "Error ("+newstr+"): Port names cannot start with uppercase U or X";
	if( newstr.length > this.maxPortnameLength )
		return "Error ("+newstr+"): Port names must be less than" + this.maxPortnameLength + "characters";
	if( ! /^[A-TV-WY-Za-z][A-Za-z0-9_]*$/.test(newstr))
		return "Error ("+newstr+"): Port names must start with a letter (other than U or X) and contain only letters, numbers, or _";
	if( this.isVerilogReserved(newstr) )
		return  "Error ("+newstr+"):" + newstr + " is a Verilog reserved word and cannot be used as a port name";
	return "";
};

schematic.prototype.checkIdentifier= function(newstr)
{
	if( newstr.length > this.maxPortnameLength )
		return "Error ("+newstr+"): Identifiers must be less than" + this.maxPortnameLength + "characters";
	if( ! /^[A-TV-WY-Za-z][A-Za-z0-9_]*$/.test(newstr))
		return "Error ("+newstr+"): Identifiers must start with a letter or _ and may not contain whitespace";
	if( this.isVerilogReserved(newstr) )
		return  "Error:" + newstr + " is a Verilog reserved word and cannot be used as an identifier";
	return "";
};

schematic.prototype.isNativeComponent = function( component ){
	var native_components=["and", "nand", "or","nor","xor","xnor","buf", "not",
					"mux2","mux4", "mux8","mux16",
					"decoder2","decoder3","decoder4",
					"register_en", "dff", "dff_en", "srlatch", "dsrlatch_en", "dlatch", "dlatch_en", 
					"fanIn2",  "fanIn4",  "fanIn8",  "fanIn16",  "fanIn32",
					"fanOut2",  "fanOut4", "fanOut8", "fanOut16", "fanOut32",
					"inputport1", "inputport2", "inputport4", "inputport8", "inputport16", "inputport32",
					"outputport1", "outputport2", "outputport4", "outputport8", "outputport16", "outputport32",
					"constant0", "constant1" ];
	return native_components.includes( component );
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
	function getModule( node ){
		return graph.getCellStyle( node )["shape"];
	}
	function searchStoredShapesFor( moduleName ){
		var storedShapes = JSON.parse(localStorage.getItem('storedShapes'));
		var i = storedShapes.length;
		while( i-- ){
			if ( storedShapes[i].componentName==moduleName )
				return storedShapes[i];
		}
	}
	function getModulePortSizes ( moduleName ) {
		return searchStoredShapesFor( moduleName ).signal_size;
	}
	function getModulePorts ( moduleName ){
		return searchStoredShapesFor( moduleName ).signals;
	}

	var Messages=new DRCMessages;

	nodes=graph.getChildVertices(graph.getDefaultParent());
	nodes.forEach(function(node){
		var mux_size=0;
		var output_size=0;
		var decoder_size=1;
		var fanout_size=0;
		var fanin_size=0;
		var module = getModule(node);
		switch( module )
		{
		//====================================================================================
		//	MISC GROUP
		//====================================================================================
		case "constant0":
		case "constant1":
			break;
		case "inputport32":
		case "inputport16":
		case "inputport8":
		case "inputport4":
		case "inputport2":			
		case "inputport1":
			if( node.numLinksOutOf() === 0 )
				Messages.addWarning(module+" is unconnected",node);
			numInputs++;
			if( node.value == "" )
				Messages.addWarning(module+" is unnamed: a default name will be provided",node);
			else
			{
				portnameError=this.checkPortName(node.value);
				if( portnameError != "")
					Messages.addError(portnameError,node);
			}
			if( output_identifiers.has(node.value))
				Messages.addError("Port name "+node.value+ " is used on output(s) and input(s)",node);
			if( node.value != "" ) 
				input_identifiers.add(node.value);
			break;
		case "outputport32": output_size++;
		case "outputport16": output_size++;
		case "outputport8":  output_size++;
		case "outputport4":  output_size++;
		case "outputport2":  output_size++;
		case "outputport1":  
			if( node.numLinksInto() === 0 )
				Messages.addError(module+" must be connected",node);
			numOutputs++;
			if( node.value == "" )
				Messages.addWarning(module+" is unnamed: a default name will be provided",node);
			else
			{
				portnameError=this.checkPortName(node.value);
				if( portnameError != "")
					Messages.addError(portnameError,node);
			}
			if( input_identifiers.has(node.value))
				Messages.addError("Port name "+node.value+ " is used on input(s) and output(s)",node);
			if( output_identifiers.has(node.value))
				Messages.addError("Port name "+node.value+ " is used on multiple outputs",node);
			if( node.value != "" ) 
				output_identifiers.add(node.value);
			var link = node.getLink("in",false);
			if ( link && link.size!=(1<<output_size) )
				Messages.addError(module+" has "+link.size+"\'b input",node);
			
			break;
		//====================================================================================
		//	BASIC GATE GROUP
		//====================================================================================
		case "buffer":
		case "inverter": 
			if( node.numLinksOutOf() == 0 )
				Messages.addWarning(module+" has an unconnected output",node);
			if( node.numLinksInto() == 0 )
				Messages.addError(module+" has an unconnected input",node);
			break;
		case "and":
		case "nand":
		case "or":
		case "nor":
		case "xor":
		case "xnor":
			if( node.numLinksOutOf() == 0 )
				Messages.addWarning(module+" gate has an unconnected output",node);
			if( node.numLinksInto() < 2 )
				Messages.addError(module+" gate must have at least 2 inputs connected",node);
			break;
		//====================================================================================
		//	MUX GROUP
		//====================================================================================
		case "mux16": mux_size++;
		case "mux8":  mux_size++;
		case "mux4":  mux_size++;
		case "mux2":  mux_size++;
			var data_inputs_connected = (1<<mux_size);
			var input_sizes = new Array();
			for (var i=0; i<mux_size; i++) {
				var link = node.getLink('sel'+i,false);
				if ( link==null )
					data_inputs_connected--;
				else if ( link.size>1 )
					Messages.addError(module+" select (sel) input has a bus connected. Only single bit wires may be connected",node);
			}
			if( data_inputs_connected < (1<<mux_size))
				Messages.addError("All "+module+" data (i) inputs must be connected",node);
			if( node.numLinksOutOf()==0 )
				Messages.addWarning(module+" has unconnected output",node);
			for (var i=0; i<(1<<mux_size); i++) {
				var link = node.getLink('in'+i, false);
				if (link)
					input_sizes.push(link.size);
			}
			if( input_sizes.length<(1<<mux_size) )
				Messages.addWarning(module+" has unconnected data (i) input(s)",node);
			var input_sizes_sorted = input_sizes.sort();
			if (input_sizes_sorted[0]!=input_sizes_sorted[input_sizes_sorted.length-1] )
				Messages.addError(module+" has busses of mismatched bit widths connected on data (i) inputs",node);
			break;
		//====================================================================================
		//	DECODER GROUP
		//====================================================================================
		case "decoder4": decoder_size++;
		case "decoder3": decoder_size++;
		case "decoder2": decoder_size++;
			var link_en = node.getLink("in_en",false);
			var address_inputs_connected = decoder_size;
			for (var i=0; i<decoder_size; i++){
				var link = node.getLink("in"+i+"_a", false);
				if ( link==null )
					address_inputs_connected--;
				else if ( link.size>1 )
					Messages.addError(module+" has unconnected address inputs",node);
			}
			if( address_inputs_connected < decoder_size)
				Messages.addError("All "+module+" address (addr) inputs must be connected",node);
			if( link_en==null )
				Messages.addError(module+" enable (en) input must be connected",node);
			else if ( link_en.size>1 )
				Messages.addError(module+" enable (en) input has a bus connected. Only single bit wires may be connected",node);
			for( var i=0; i<(1<<decoder_size); i++ ) {
				if( node.getLinks("out"+i,true).length == 0) {
					Messages.addWarning(module+" has an unconnected data output(s)",node);
					break;
				}
			}
			break;
		//====================================================================================
		//	REGISTER GROUP
		//====================================================================================
		case "register_en":
			var link_en = node.getLink("in_en",false);
			var link_clk = node.getLink("in_clk",false);
			var link_d = node.getLink("in_D",false);
			if( link_en==null)
				Messages.addError(module+" enable (en) input must be connected",node);
			else if ( link_en.size!=1 )
				Messages.addError(module+" enable (en) input has a bus connected. Only single bit wires may be connected",node);
			if( link_clk==null )
				Messages.addError(module+" clock (clk) input must be connected",node);
			else if ( link_clk.size!=1 )
				Messages.addError(module+" clock (clk) input has a bus connected. Only single bit wires may be connected",node);
			if( link_d==null )
				Messages.addError(module+" data (D) input must be connected",node);
			if( node.numLinksOutOf() == 0 )
				Messages.addWarning(module+" has unconnected output",node);
			break;
		case "srlatch_en":
			var link_en = node.getLink("in_en",false);
			if( link_en==null )
				Messages.addError(module+" enable (en) input must be connected",node);
			else if ( link_en.size>1 )
				Messages.addError(module+" enable (en) input has a bus connected. Only single bit wires may be connected",node);
		case "srlatch":
			var link_S = node.getLink("in_S",false);
			var link_R = node.getLink("in_R",false);
			if( link_S==null )
				Messages.addError(module+" S (S) input must be connected",node);
			else if ( link_S.size>1 )
				Messages.addError(module+" S (S) input has a bus connected. Only single bit wires may be connected",node);
			if( link_R==null )
				Messages.addError(module+" R (R) input must be connected",node);
			else if ( link_R.size>1 )
				Messages.addError(module+" R (R) input has a bus connected. Only single bit wires may be connected",node);
			if( node.numLinksOutOf() == 0 )
				Messages.addWarning(module+" has an unconnected output",node);
			break;
		case "dlatch_en":
			var link_en = node.getLink("in_en",false);
			if( link_en==null )
				Messages.addError(module+" enable (en) input must be connected",node);
			else if ( link_en.size>1 )
				Messages.addError(module+" enable (en) input has a bus connected. Only single bit wires may be connected",node);
		case "dlatch":
			var link_D = node.getLink("in_D",false);
			var link_G = node.getLink("in_G",false);
			if( link_D==null )
				Messages.addError(module+" D (D) input must be connected",node);
			else if ( link_D.size>1 )
				Messages.addError(module+" D (D) input has a bus connected. Only single bit wires may be connected",node);
			if( link_G==null )
				Messages.addError(module+" G (G) input must be connected",node);
			else if ( link_G.size>1 )
				Messages.addError(module+" G (G) input has a bus connected. Only single bit wires may be connected",node);
			if( node.numLinksOutOf() == 0 )
				Messages.addWarning(module+" has an unconnected output",node);
			break;
		case "dff_en":
			var link_en = node.getLink("in_en",false);
			if( link_en==null )
				Messages.addError(module+" enable (en) input must be connected",node);
			else if ( link_en.size>1 )
				Messages.addError(module+" enable (en) input has a bus connected. Only single bit wires may be connected",node);
		case "dff":
			var link_D = node.getLink("in_D",false);
			var link_clk = node.getLink("in_clk",false);
			if( link_D==null )
				Messages.addError(module+" D (D) input must be connected",node);
			else if ( link_D.size>1 )
				Messages.addError(module+" D (D) input has a bus connected. Only single bit wires may be connected",node);
			if( link_clk==null )
				Messages.addError(module+" clock (clk) input must be connected",node);
			else if ( link_clk.size>1 )
				Messages.addError(module+" clock (clk) input has a bus connected. Only single bit wires may be connected",node);
			if( node.numLinksOutOf() == 0 )
				Messages.addWarning(module+" has an unconnected output",node);
			break;
		//====================================================================================
		//	BUS GROUP
		//====================================================================================
		// -Warning if not all outputs are connected
		// -Warning if input is not the bus size of the fanout
		// -Error if input is not connected
		// -Error if no outputs are connected
		case "fanOut32": fanout_size++;
		case "fanOut16": fanout_size++;
		case "fanOut8":  fanout_size++;
		case "fanOut4":	 fanout_size++;
		case "fanOut2":  fanout_size++;
			if ( node.numLinksInto() == 0)
				Messages.addError(module+" input is unconnected",node);
			if( node.numLinksOutOf() == 0 )
				Messages.addError(module+" has no connected outputs",node);
			else if( node.numLinksOutOf() != (1<<fanout_size) )
				Messages.addWarning(module+" has " + ((1<<fanout_size)-node.numLinksOutOf()) + " unconnected outputs",node);
			var linkin = node.getLink("in",false);
			if ( linkin && linkin.size!=(1<<fanout_size) ) 
				Messages.addError(module+" has "+linkin.size+"\'b bus connected on input. Only "+(1<<fanout_size)+"'b busses may be connected",node);
			break;

		// -Warning if not all inputs are connected
		// -Error if output is not connected
		// -Error if no inputs are connected
		// -Error if input is not a 1-bit wire
		case "fanIn32":	fanin_size++;
		case "fanIn16":	fanin_size++;
		case "fanIn8":  fanin_size++;
		case "fanIn4":  fanin_size++;
		case "fanIn2":  fanin_size++;
			if ( node.numLinksOutOf() == 0)
				Messages.addError(module+" output is unconnected",node);
			if( node.numLinksInto() == 0 )
				Messages.addError(module+" has no connected inputs",node);
			else if( node.numLinksInto() < (1<<fanin_size) )
				Messages.addWarning(module+" has " + ((1<<fanin_size)-node.numLinksInto()) + " unconnected inputs",node);
			for (var i=0; i<(1<<fanin_size); i++) {
				var link = node.getLink('in'+i+'_w');
				if ( link && link.size!=(1<<fanin_size) )
					Messages.addError(module+" has a bus connected on input  port in"+i+". Only single bit wires may be connected",node);		
			}
			break;
		//====================================================================================
		//	IMPORTED GROUP
		//====================================================================================
		// -Warning of not all inputs are connected
		// -Error if name is invalid identifier
		// -Error if wrong size bus is connected on input
		default:
			var ports_sizes = getModulePortSizes(module);
			var ports = getModulePorts(module);
			var num_links_in = node.numLinksInto();
			if (num_links_in< ports.input.length)
				Messages.addWarning(module + " has unconnected inputs",node);
			for (var i=0; i<ports_sizes.input.length; i++) {
				var link = node.getLink('in'+i+'_w',false);
				if ( link && link.size!=ports_sizes.input[i] )
					Messages.addError(module + " has mismatched bit width connected on "+ports.input[i],node);
			}
			for (var i=0; i<ports_sizes.output.length; i++) {
				var link = node.getLink('out'+i+'_e',true);
				if ( !link )
					Messages.addWarning(module + " has unconnected output on port "+ports.output[i],node);
			}
			nameError=this.checkIdentifier(module);
			if( nameError != "")
				Messages.addError(nameError,node);
			break;
		}
		
	},this);
	
	if( numOutputs===0 )
		Messages.addError("Schematic must have at least one connected output",null);
	if( numInputs===0 )
		Messages.addWarning("Schematic has unconnected inputs",null);
	return Messages;
};
/* prototype method: function getImportedComponentsForExport
 *		Returns verilog code stored in cache memory associated with module
 * module: module whose Verilog code will be returned
 */
schematic.prototype.getImportedComponentVerilog=function( module ){
	/* helper function: getModuleVerilog
	 * 		Returns verilog code stored in cache memory with imported component
	 *		name module
	 * moduleName: the name of component being retreived
	 */
	function getModuleVerilog( moduleName ) {
		var storedShapes = JSON.parse(localStorage.getItem('storedShapes'));
		var currentModule;
		if ( storedShapes ) storedShapes.forEach(function(shape){
			if (shape.componentName==moduleName) currentModule = shape;
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
/* prototype method: function getImportedComponentsForExport
 *		Returns set of all imported components used in the schematic
 */
schematic.prototype.getImportedComponentsForExport=function(){
	var graph=this.graph;
	nodes=graph.getChildVertices(graph.getDefaultParent());
	var components = new Set();
	if( nodes ) nodes.forEach(function(item){
		var style=graph.getCellStyle(item); 
		var module = style["shape"];
		if ( !schematic.prototype.isNativeComponent(module) ) 
			components.add( module );
	});
	return components;
}
/* prototype method: function getNativeComponentsForExport
 *		Returns set of all native components used in the schematic that
 *      need .v files to be exported
 */
schematic.prototype.getNativeComponentsForExport=function(){/*
	var graph=this.graph;
	nodes=graph.getChildVertices(graph.getDefaultParent());
	var components = new Set();
	if( nodes ) nodes.forEach(function(item){
		var style=graph.getCellStyle(item); 
		var module = style["shape"];
		if ( !schematic.prototype.isNativeComponent(module) ) 
			components.add( module );
	});
	return components;
*/}
/* prototype method: function deleteClearedComponents
 *		After the user clears imported components, this function will delete
 *		any such components left on the graph
 *		Returns nothing
 */
schematic.prototype.deleteClearedComponents = function(){
	var graph=this.graph;
	nodes =  graph.getChildVertices(graph.getDefaultParent());
	var cells = new Array;
	
	function storedShapesIncludes( moduleName ){
		var storedShapes = JSON.parse(localStorage.getItem('storedShapes'));
		var i = storedShapes.length;
		while( i-- ){
			if ( storedShapes[i].componentName==moduleName )
				return true;
		}
		return false;
	}
	
	if( nodes ) nodes.forEach(function(node){
		var style=graph.getCellStyle(node); 
		var module = style["shape"];
		if ( !schematic.prototype.isNativeComponent(module) && !storedShapesIncludes(module) ){
			cells.push(node);
		}
	});
	graph.removeCells(cells);
}
/* prototype method: function createVerilog
 *		Returns synthesizeable Verilog code generated from graph
 *		Maps netlist and sets bit width of all wires
 */
schematic.prototype.createVerilog=function()
{
	var netList="";
	var inputList="";
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
					mux2:"mux #(2,", mux4:"mux #(4,", mux8:"mux #(8,", mux16:"mux #(16,",
					decoder2:"decoder #(2)",decoder3:"decoder #(3)",decoder4:"decoder #(4)",
					register_en:"register_en", dlatch:"d_latch",dlatch_en:"d_latch_en",dff:"dff",dff_en:"dff_en",srlatch:"sr_latch",srlatch_en:"sr_latch_en",
					fanIn2: "fanIn2", fanIn4: "fanIn4", fanIn8: "fanIn8", fanIn16: "fanIn16", fanIn32: "fanIn32",
					fanOut2: "fanOut2", fanOut4: "fanOut4", fanOut8: "fanOut8", fanOut16: "fanOut16", fanOut32: "fanOut32" 
				};
	/* helper function: function gateName
	 *		Returns the node's unique ID number prefixed by prefix
	 * node: the node whose value will be checked. Must be an inputport
	 * prefix: prefix to use if inputport has not been asssigned a name by user
	 */
	function gateName( node, prefix){ 
		return prefix+node.id;
	}
	/* helper function: portName
	 * 		Checks if user has assigned inputport a name. If so, this name is returned.
	 *		Otherwise, call gateName
	 * node: the node whose value will be checked. Must be an inputport
	 * prefix: prefix to use if inputport has not been asssigned a name by user
	 */
	function portName( node, prefix ){ 
		return node.value ? node.value : gateName(node,prefix);
	}
	/* helper function: netName
	 * 		Creates a name for a wire. Verilog requires that wire names
	 *		start with a letter, so name is prefixed with "X" and followed
	 *		by the link's unique ID number. If source module has multiple outputs,
	 *		then the link ID is followed by the source port ID number
	 * link: the link whose ID number will be used
	 */
	function netName( link ){
		var port_id = getSrcPortID( link );
		if( port_id == "" )
			return 'X'+link.source.id;
		else
			return 'X'+link.source.id + '_'+ port_id;
	}
	/* helper function: getNameOrAlias
	 * 		Returns alias associated with link. This alias may be an 
	 *		inputport name, a bus indexed with bracket notation if the 
	 *		source module is a fanOut, unassigned, or a single bit wire
	 * link: the node whose alias will be returned
	 */
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
	/* helper function: getModule
	 * 		Returns the module name associated with node
	 * node: the node whose module name will be returned
	 */
	function getModule( node ){
		return graph.getCellStyle( node )["shape"];
	}
	/* helper function: getSrcPortID
	 * 		Each outputport of a module is assigned an ID number starting at 0 
	 *		for the top port and increasing by 1. Returns the ID of the port
	 *		link is sourced from
	 * link: the edge whose source port ID will be returned
	 */
	function getSrcPortID ( link ) {
		var port_object = /sourcePort=out([^_]*)/.exec(link.style);
		if ( port_object ) 
			return port_object[1];
	}
	/* helper function: getTrgtPortID
	 * 		Each inputport of a module is assigned an ID number starting at 0 
	 *		for the top port and increasing by 1. Returns the ID of the port
	 *		link targets
	 * link: the edge whose target port ID will be returned
	 */
	function getTrgtPortID ( link ) {
		var port_object =  /targetPort=in([^_]*)/.exec(link.style);
		if ( port_object ) 
			return port_object[1];
	}
	/* helper function: srcNodeIs
	 * 		Returns true of the source module of link is moduleName
	 * link: the edge whose target module will be checked
	 * moduleName: name of module to check for
	 */
	function srcNodeIs( link, moduleName ){
		return getModule( link.source ).includes( moduleName );
	}
	/* helper function: trgtNodeIs
	 * 		Returns true of the target module of link is moduleName
	 * link: the edge whose target module will be checked
	 * moduleName: name of module to check for
	 */
	function trgtNodeIs( link, moduleName ){
		return getModule( link.target ).includes( moduleName );
	}
	/* helper function: searchStoredShapesFor
	 * 		Searches through each component stored in cache memory and returns the 
	 *		one whose name matches moduleName
	 * moduleName: name of moduled to retrieve
	 */
	function searchStoredShapesFor( moduleName ){
		var storedShapes = JSON.parse(localStorage.getItem('storedShapes'));
		var i = storedShapes.length;
		while( i-- ){
			if ( storedShapes[i].componentName==moduleName )
				return storedShapes[i];
		}
	}
	/* helper function: getModulePortSizes
	 * 		Returns object having two attributes;  the first is an array of inputport bit widths,
	 *		the second is an array of outputport bit widths. This object is stored in cache memory
	 *		with the imported component named moduleName
	 * moduleName: name of moduled to retrieve
	 */
	function getModulePortSizes ( moduleName ) {
		return searchStoredShapesFor( moduleName ).signal_size;
	}
	/* helper function: getModulePorts
	 * 		Returns object having two attributes;  the first is an array of inputport named,
	 *		the second is an array of outputport names. This object is stored in cache memory
	 *		with imported components
	 * moduleName: name of moduled to retrieve
	 */
	function getModulePorts ( moduleName ){
		return searchStoredShapesFor( moduleName ).signals;
	}
	/* helper function: sortNodes
	 * 		Sorts nodes so any module which can determine bit width is placed first, others after them
	 *  	Returns set of sorted nodes
	 * unsorted_nodes: set of nodes to be sorted
	 */
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
	/* helper function: setCellStyleAttribute
	 * 		If cell does not have attribute, it will be created and initialized to value
	 *      Othewise, its value will be replaced with value
	 * cell: cell to be modified
	 * attribute: attribute to be modified or initialized
	 * value: value to be assigned to style attribue
	 */
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
	/* helper function: setLinkSetSize
	 * 		Creates attribute size for edges and initializes it to size
	 * 		Modifies edges cell style to scale its strokeWidth in proportion to bit width
	 * link_set: a set of edges in the graph
	 * size: bit width
	 */
	function setLinkSetSize(link_set, size){
		if ( link_set ) link_set.forEach(function(link){
			link.size = size;
			if ( size>1 )
				link.value = size;
			setCellStyleAttribute( link, "strokeWidth", Math.log2(size)+1 );
		});
	}
	//nodes must be sorted so any module which can determine a wire's bit width is processed before modules that can't
	nodes = sortNodes( graph.getChildVertices(graph.getDefaultParent()) );
	//Iterate through the nodes a first time to define net aliases
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
				//if user named port, use that name as net alias
				if( node.value && links.length )
					netAliases[netName(links[0])] = node.value;
				//otherwise, generate name
				else if( links.length )
					netAliases[netName(links[0])] = portName(node,"I");
				break;
			case "constant0": 
				//any wire coming from a constant0 will be named 1b'0
				var links=node.linksOutOf();
				if( node.value && links.length )
					links.forEach( function( link ){
					netAliases[netName(link)] = '1\'b0';});
				break;
			case "constant1": 
				//any wire coming from a constant1 will be named 1b'1
				var links=node.linksOutOf();
				if( node.value && links.length )
					links.forEach( function( link ){
					netAliases[netName(link)] = '1\'b1';});
				break;
		}
	});
	//Iterate through the nodes a second time to map the netlist, including bit widths of all wires
	if( nodes ) nodes.forEach(function(node){
		var decoder_size=1;
		var fanin_size=0;
		var mux_size=0;
		var inputport_size=0;
		var module = getModule( node );
		switch( module )
		{
		case "inputport32": inputport_size++;
		case "inputport16": inputport_size++;
		case "inputport8":  inputport_size++;
		case "inputport4":  inputport_size++;
		case "inputport2":  inputport_size++;
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
		case "dlatch":
		case "dlatch_en":
		case "srlatch":
		case "srlatch_en":
		case "dff":
		case "dff_en":
			var linksout=node.linksOutOf();
			if( linksout.length == 1 && trgtNodeIs(linksout[0], "outputport") )
				netAliases[netName(linksout[0])] = portName(linksout[0].target,"O");
			else
				wireSet[(1<<0)].add(gateName(node,"X") );
			setLinkSetSize(linksout, 1);
			break;
		case "register_en":
			var output_size=1;
			var input = node.getLinks('in_D',false);
			if(input[0] && input[0].size) 
				output_size = input[0].size;
			var linksout=node.linksOutOf();
			if( linksout.length == 1 && trgtNodeIs(linksout[0], "outputport") ) 
				netAliases[netName(linksout[0])] = portName(linksout[0].target,"O");
			else if( linksout.length ) 
				wireSet[output_size].add(netName(linksout[0],"X"));
			setLinkSetSize(linksout, output_size);
			break;
		case "mux16": mux_size++;
		case "mux8":  mux_size++;
		case "mux4":  mux_size++;
		case "mux2":  mux_size++;
			var output_size=1;
			for (var i=0; i<(1<<mux_size); i++) {
				var linkin = node.getLink('in'+i, false);
				if (linkin && linkin.size>output_size) 
					output_size=linkin.size;
			}
			var linksout=node.linksOutOf();
			if( linksout.length == 1 && trgtNodeIs(linksout[0], "outputport") ) 
				netAliases[netName(linksout[0])] = portName(linksout[0].target,"O");
			else
				wireSet[output_size].add(gateName(node,"X") );
			setLinkSetSize(linksout, output_size);
			break;
		case "decoder4": decoder_size++;
		case "decoder3": decoder_size++;
		case "decoder2": decoder_size++;
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
		case "fanOut32":
		case "fanOut16":
		case "fanOut8": 
		case "fanOut4": 
		case "fanOut2": 
			var linksout=node.linksOutOf();
			setLinkSetSize(linksout, 1);
			break;
		case "fanIn32": fanin_size++;
		case "fanIn16": fanin_size++;
		case "fanIn8":  fanin_size++;
		case "fanIn4":  fanin_size++;
		case "fanIn2":  fanin_size++;
			var linksout=node.linksOutOf();
			if( linksout.length == 1 && trgtNodeIs(linksout[0], "outputport") ) 
				netAliases[netName(linksout[0])] = portName(linksout[0].target,"O");
			setLinkSetSize(linksout, (1<<fanin_size));
			break;
		default:
			var portSizes = getModulePortSizes(module);
			var linksout=node.linksOutOf();
			var outputs = new Set();
			linksout.forEach(function(link){
				outputs.add( getSrcPortID(link) );
			});
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
	//Iterate through nodes a third time to create the Verilog code for export
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
		case "inputport8":  inputport_size++;
		case "inputport4":  inputport_size++;
		case "inputport2":  inputport_size++;
		case "inputport1":
			if (inputport_size==0) 
				inputList+="\n\tinput " + portName(node,'I') +',';
			else
				inputList+="\n\tinput [" + ((1<<inputport_size)-1) + ':0] ' + portName(node,'I') +',';
			break;
		case "outputport32": outputport_size++;
		case "outputport16": outputport_size++;
		case "outputport8":  outputport_size++;
		case "outputport4":  outputport_size++;
		case "outputport2":  outputport_size++;
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
		case "and":
		case "or":
		case "xor":
		case "nand":
		case "nor":
		case "xnor":
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
				links.forEach( function(link){ netList += getNameOrAlias( link) + ', ';});
			else
				netList += '1\'bx,';
			//delete last comma
			netList=netList.replace(/, *$/gi, '');
			netList=netList+");";
			break; 
		case "mux16": mux_size++;
		case "mux8":  mux_size++;
		case "mux4":  mux_size++;
		case "mux2":  mux_size++;
			var output_size=1;
			for( var i=0; i<(1<<mux_size); i++ )
			{
				var linki = node.getLink( 'in'+i,false);
				if (linki && linki.size>output_size)
					output_size = linki.size;
			}
			netList += "\n\n" + gateNames[module] + output_size +') '+gateName(node,"U") + " ("; 
			netList=netList+"\n\t";
			for( var i=0; i<(1<<mux_size); i++ )
			{
				var linki = node.getLink( 'in'+i,false);
				if( linki ) 
					netList += '.i' + i + '(' + getNameOrAlias( linki) + '), ';
			}
			netList += '\n\t.sel( {';
			//iterate through each select input
			for( var i=mux_size-1; i>=0; i=i-1 )
			{
				var lnk=node.getLink( 'sel'+i,false);
				if( lnk ) 
					netList+=getNameOrAlias( lnk);
				else 
					netList+='1\'bx';
				netList+=',';
			}
			//delete last comma
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
				netList += '\n\t.in_D(' + getNameOrAlias( linkin) + ')';
			var linkclk=node.getLink( 'in_clk_',false);
			if( linkclk )
				netList += ',\n\t.in_clk(' + getNameOrAlias( linkclk) + ')';
			var linken=node.getLink( 'in_en_',false);
			if( linken ) 
				netList += ',\n\t.in_en(' + getNameOrAlias( linken) + ')';
			var linkq=node.linksOutOf();
			if( linkq.length )
				netList += ',\n\t.out_q('+getNameOrAlias( linkq[0]) + ")";
			netList=netList+"\n);";
			break;
		case "dlatch":
		case "dlatch_en":
			netList += '\n\n' + gateNames[module] +  ' ' + gateName(node,'U') + ' ('; 
			var linkin=node.getLink( 'in_D_',false);
			if( linkin )
				netList += '\n\t.in_D(' + getNameOrAlias( linkin) + ')';
			var linkg=node.getLink( 'in_G_',false);
			if( linkg )
				netList += ',\n\t.in_G(' + getNameOrAlias( linkg) + ')';
			var linken=node.getLink( 'in_en_',false);
			if( linken ) 
				netList += ',\n\t.in_en(' + getNameOrAlias( linken) + ')';
			var linkq=node.linksOutOf();
			if( linkq.length )
				netList += ',\n\t.out_q('+getNameOrAlias( linkq[0]) + ")";
			netList=netList+"\n);"
			break;
		case "srlatch":
		case "srlatch_en":
			netList += '\n\n' + gateNames[module] +  ' ' + gateName(node,'U') + ' ('; 
			var linkin=node.getLink( 'in_S_',false);
			if( linkin )
				netList += '\n\t.in_S(' + getNameOrAlias( linkin) + ')';
			var linkr=node.getLink( 'in_R_',false);
			if( linkr )
				netList += ',\n\t.in_R(' + getNameOrAlias( linkr) + ')';
			var linken=node.getLink( 'in_en_',false);
			if( linken ) 
				netList += ',\n\t.in_en(' + getNameOrAlias( linken) + ')';
			var linkq=node.linksOutOf();
			if( linkq.length )
				netList += ',\n\t.out_q('+getNameOrAlias( linkq[0]) + ")";
			netList=netList+"\n);"
			break;
		case "dff":
		case "dff_en":
			netList += '\n\n' + gateNames[module] +  ' ' + gateName(node,'U') + ' ('; 
			var linkin=node.getLink( 'in_D_',false);
			if( linkin )
				netList += '\n\t.in_D(' + getNameOrAlias( linkin ) + ')';
			var linkclk=node.getLink( 'in_clk_',false);
			if( linkclk )
				netList += ',\n\t.in_clk(' + getNameOrAlias( linkclk ) + ')';
			var linken=node.getLink( 'in_en_',false);
			if( linken ) 
				netList += ',\n\t.in_en(' + getNameOrAlias( linken) + ')';
			var linkq=node.linksOutOf();
			if( linkq.length )
				netList += ',\n\t.out_q('+getNameOrAlias( linkq[0]) + ")";
			netList=netList+"\n);"
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
			//delete last comma
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
			//delete last comma
			netList=netList.replace(/, *$/gi, '');
			netList=netList+"} ),\n\t.en_in( ";
			var linken=node.getLink( 'in_en',false);
			if( linken ) 
				netList+=getNameOrAlias( linken );
			//otherwise add 1b'x to port instantiation
			else 
				netList+='1\'bx';
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
		case "fanIn8":  fanin_size++;
		case "fanIn4":  fanin_size++;
		case "fanIn2":  fanin_size++;
			var assignment = "";
			var links=node.linksOutOf();
			if(links.length == 1 && trgtNodeIs(links[0], "outputport") ) 
				assignment += "\nassign "+getNameOrAlias( links[0]) +' = { ';
			else
				assignment += "\nwire ["+((1<<fanin_size)-1)+":0] "+gateName(node,"X")+" = { ";
			for( var i=(1<<fanin_size)-1; i>=0; i=i-1 )
			{
				var lnk=node.getLink( 'in'+i,false);
				if( lnk ) 
					assignment+=getNameOrAlias( lnk);
				else 
					assignment+='1\'bx';
				assignment+=', ';
			}
			//delete last comma
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
				var portInstantiation = "\n\t." + ports.output[id] + "(" + getNameOrAlias( link) + '),' ;
				if (!netList.includes(portInstantiation)) 
					netList += portInstantiation;
			});
			//delete last comma
			netList=netList.replace(/, *$/gi, '');
			netList=netList+"\n);";
			break;
		}
	});
	//begin top level module instantiation with all of its port instantiations
	verilogCode="module top_level (";
	if( inputList != '' || outputList != '')
	{
		verilogCode += inputList;
		verilogCode += outputList;
		//delete last comma
		verilogCode=verilogCode.replace(/, *$/gi, '');
	}
	verilogCode+="\n);\n\n";
	//Print bus declarations
	for (var i=5; i>=1; i--) {
		wireSet[(1<<i)].forEach( function(wire){ wireList[(1<<i)] += wire + ", "; } );
		if( wireList[(1<<i)] != "" )
		{
			wireList[(1<<i)]=wireList[(1<<i)].replace(/, *$/gi, '');
			verilogCode+="\nwire [" + ((1<<i)-1) + ":0] "+wireList[(1<<i)]+";";
		}
	}
	//Print 1-bit Wire declarations
	wireSet[(1<<0)].forEach( function(wire){ wireList[(1<<0)] += wire + ", "; } );
	if( wireList[(1<<0)] != "" )
	{
		wireList[(1<<0)]=wireList[(1<<0)].replace(/, *$/gi, '');
		verilogCode+="\nwire "+wireList[(1<<0)]+";\n";
	}
	if( wireAssignList != "" )
		verilogCode+=wireAssignList;
	if( outputAssignList != "" )
		verilogCode+=outputAssignList;
	if( netList != '' )
		verilogCode+=netList;
	verilogCode+="\n\nendmodule\n";
	//refresh the graph because wires' bit widths may have changed
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
