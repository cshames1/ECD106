/**
 * Copyright (c) 2018, Douglas H. Summerville, Binghamton University
 * Updated by 2021 [ECD106] Charlie Shames, Thomas Nicolino, Ben Picone, Joseph Luciano; Advisor: Meghana Jain
 */

class schematic
{
	constructor(graph) {
		this.graph = graph;
		this.maxPortnameLength=20;
	}
	static isNativeComponent( component ){
		var native_components=["and", "nand", "or","nor","xor","xnor","buf", "inverter",
						"mux2","mux4", "mux8","mux16",
						"decoder2","decoder3","decoder4", 
						"dff", "dff_en", "srlatch", "srlatch_en", "dlatch", "dlatch_en", 
						"fanIn2",  "fanIn4",  "fanIn8",  "fanIn16",  "fanIn32",
						"fanOut2",  "fanOut4", "fanOut8", "fanOut16", "fanOut32",
						"inputport1", "inputport2", "inputport4", "inputport8", "inputport16", "inputport32",
						"outputport1", "outputport2", "outputport4", "outputport8", "outputport16", "outputport32",
						"constant0", "constant1" ];
		return native_components.includes( component );
	}; 
	static isVerilogReserved( str ){
		var verilogReserved=new Set( ["always", "ifnone", "rpmos", "and", "initial", "rtran", "assign", "inout", "rtranif0", "begin", "input", "rtranif1", "buf", "integer", "scalared", "bufif0", "join", "small", "bufif1", "large", "specify", "case", "macromodule", "specparam", "casex", "medium", "strong0", "casez", "module", "strong1", "cmos", "nand", "supply0", "deassign", "negedge", "supply1", "default", "nmos", "table", "defparam", "nor", "task", "disable", "not", "time", "edge", "notif0", "tran", "else", "notif1", "tranif0", "end", "or", "tranif1", "endcase", "output", "tri", "endmodule", "parameter", "tri0", "endfunction", "pmos", "tri1", "endprimitive", "posedge", "triand", "endspecify", "primitive", "trior", "endtable", "pull0", "trireg", "endtask", "pull1", "vectored", "event", "pullup", "wait", "for", "pulldown", "wand", "force", "rcmos", "weak0", "forever", "real", "weak1", "fork", "realtime", "while", "function", "reg", "wire", "highz0", "release", "wor", "highz1", "repeat", "xnor", "if", "rnmos", "xor"]);
		return verilogReserved.has(str);
	};
	static isValidID( newstr ){
		return (this.getIDerror(newstr)=="" );
	};
	static getIDerror( newstr ){
		function isAlpha(c){
			return /^[A-Z]$/i.test(c);
		}
		if( newstr.length > this.maxPortnameLength )
			return "Error ("+newstr+"): Identifiers must be less than" + this.maxPortnameLength + "characters";
		if( !isAlpha(newstr[0]) && newstr[0]!='_' || newstr.includes(" ") ) 
			return "Error ("+newstr+"): Identifiers must start with a letter or _ and may not contain whitespace";
		if( schematic.isVerilogReserved(newstr) )
			return  "Error:" + newstr + " is a Verilog reserved word and cannot be used as an identifier";
		return "";
	};
	static nameIsUsed( newstr, id ){
		var storedShapes = JSON.parse(localStorage.getItem('storedShapes'));
		if (storedShapes) for (var i=0; i<storedShapes.length; i++) {
			if(id!=i && newstr==storedShapes[i].componentName )
				return true;
		}
		return false;
	};
	static removeVerilogComments( verilog ){
		var new_text = "";
		const state_type = {
			NORMAL_CODE:'normal_code',
			COMMENT_TYPE1:'comment_type1',
			COMMENT_TYPE2:'comment_type2'
		}
		let state = state_type.NORMAL_CODE;
		for (var i=0; i<verilog.length; i++) {
			switch (state){
				case state_type.NORMAL_CODE:
					if ( (verilog[i]+verilog[i+1])=='//' ) 
						state = state_type.COMMENT_TYPE1;
					else if ( (verilog[i]+verilog[i+1])=='/*' ) 
						state = state_type.COMMENT_TYPE2;
					else
						new_text += verilog[i];
					break;
				case state_type.COMMENT_TYPE1:
					if ( verilog[i]=='\n' )
						state = state_type.NORMAL_CODE;
					break;
				case state_type.COMMENT_TYPE2:
					if ( (verilog[i-1]+verilog[i])=='*/' ) 
						state = state_type.NORMAL_CODE;
					break;
			}
		}
		return new_text;
	};
	static addComponent( verilog,compName,xml ){
		var verilog_no_comments = schematic.removeVerilogComments( verilog ).toLowerCase();
		
		var port_instantiation = "";
		var index = verilog_no_comments.indexOf('(')+1;
		while (verilog_no_comments[index]!=')') {
			port_instantiation += verilog_no_comments[index++];
		}
		port_instantiation = port_instantiation.trim();
		var tokens = port_instantiation.split(',');

		var signals = {input:[], output:[]};
		var signal_size = {input:[], output:[]};
		var last_port_type;
		var last_port_size;
		function get_port_size (line){
			if (line.includes('[')) {
				var port_size = line.split('[')[1];
				port_size = parseInt(port_size.split(':')[0]);
				return port_size+1;
			}
			return 1;
		}
		tokens.forEach(function(token){
			var line  = "";
			line += token.trim();
			if ( line.includes('input') ){
				last_port_type = 'input';
				last_port_size = get_port_size( line );
			}
			else if ( line.includes('output') ) {
				last_port_type = 'output';
				last_port_size = get_port_size( line );
			}
			var words = line.split(' ');
			var port_name = words[words.length-1];
			
			signals[last_port_type].push(port_name);
			signal_size[last_port_type].push(last_port_size);
		});
		
		//save the decoded shape to localstorage
		var storedShapes = JSON.parse(localStorage.getItem('storedShapes'));
		if(storedShapes == null)
			storedShapes = []
		if ( signals['input'].length!=0 && signals['input'].length!=0) {
			storedShapes.push({
				"componentName":compName.replace(".v", ""),
				"signals":signals,
				"signal_size":signal_size,
				"verilogCode":verilog,
				"xml":xml
			});
		}
		localStorage.setItem('storedShapes', JSON.stringify(storedShapes));
		//reload the page
		location.reload();
	};
}

schematic.prototype.checkPortName= function(newstr)
{
	var check_id_error = schematic.getIDerror(newstr);
	if ( check_id_error )
		return check_id_error;
	if( /^[UX].*$/.test(newstr) )
		return "Error ("+newstr+"): Port names cannot start with uppercase U or X";
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
	function getErrorsForModuleInputPort( port_flag, bit_width, node ){
		port_flag = port_flag.toString();
		var link = node.getLink( "in"+port_flag,false );
		var module = getModule( node );
		var warning = "";
		port_flag = port_flag.replace('_', '');
		if( link==null )
			warning += module+" input "+((port_flag)?"(":"")+port_flag+((port_flag)?")":"")+" must be connected";
		else if ( bit_width && link.size!=bit_width )
			warning += module+" input "+((port_flag)?"(":"")+port_flag+((port_flag)?")":"")+" has a "+link.size+"\'b wire connected. Only "+bit_width+"\'b wires may be connected";
		return warning;
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
				Messages.addWarning(((node.value)?node.value:module)+" is unconnected",node);
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
			var in_error =  getErrorsForModuleInputPort("",(1<<output_size),node);
			if (in_error)
				Messages.addError( in_error,node );
			break;
		//====================================================================================
		//	BASIC GATE GROUP
		//====================================================================================
		case "buffer":
		case "inverter": 
			if( node.numLinksOutOf() == 0 )
				Messages.addWarning(module+" has an unconnected output",node);
			var in_error =  getErrorsForModuleInputPort("",1,node);
			if (in_error)
				Messages.addError( in_error,node );
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
			var links = node.linksInto();
			for (var i=0; i<links.length; i++) {
				if (links[i].size>1){
					Messages.addError(module+" gate may only have single bit wires connected",node);
					break;
				}
			}
			break;
		//====================================================================================
		//	MUX GROUP
		//====================================================================================
		case "mux16": mux_size++;
		case "mux8":  mux_size++;
		case "mux4":  mux_size++;
		case "mux2":  mux_size++;
			var data_inputs_connected = (1<<mux_size);
			for (var i=0; i<mux_size; i++) {
				var sel_error = getErrorsForModuleInputPort("_sel"+i,1,node);
				if (sel_error)
					Messages.addError(sel_error,node);
			}
			if( data_inputs_connected < (1<<mux_size))
				Messages.addError("All "+module+" data (i) inputs must be connected",node);
			if( node.numLinksOutOf()==0 )
				Messages.addWarning(module+" has unconnected output",node);
			for (var i=0; i<(1<<mux_size); i++) {
				var in_error = getErrorsForModuleInputPort("_"+i,1,node);
				if (in_error)
					Messages.addError(in_error,node);
			}
			break;
		//====================================================================================
		//	DECODER GROUP
		//====================================================================================
		case "decoder4": decoder_size++;
		case "decoder3": decoder_size++;
		case "decoder2": decoder_size++;
			for (var i=0; i<decoder_size; i++){
				var in_error = getErrorsForModuleInputPort(i,1,node);
				if (in_error)
					Messages.addError(in_error,node);
			}
			var en_error = getErrorsForModuleInputPort('_en',1,node);
			if (en_error)
				Messages.addError(en_error,node);
			for( var i=0; i<(1<<decoder_size); i++ ) {
				if( node.getLinks("out"+i,true).length == 0) {
					Messages.addWarning(module+" has an unconnected data output(s)",node);
					break;
				}
			}
			break;
		//====================================================================================
		//	LATCH GROUP
		//====================================================================================
		case "srlatch_en":
			var en_error = getErrorsForModuleInputPort("_en",1,node);
			if (en_error)
				Messages.addError( en_error,node );
		case "srlatch":
			var S_error = getErrorsForModuleInputPort("_S",1,node);
			var R_error =  getErrorsForModuleInputPort("_R",1,node);
			if (S_error)
				Messages.addError( S_error,node );
			if (R_error)
				Messages.addError( R_error,node );
			if( node.numLinksOutOf() == 0 )
				Messages.addWarning(module+" has an unconnected output",node);
			break;
		case "dlatch_en":
			var en_error = getErrorsForModuleInputPort("_en",1,node);
			if (en_error)
				Messages.addError( en_error,node );
		case "dlatch":
			var D_error = getErrorsForModuleInputPort("_D",1,node);
			var G_error =  getErrorsForModuleInputPort("_G",1,node);
			if (D_error)
				Messages.addError( D_error,node );
			if (G_error)
				Messages.addError( G_error,node );
			if( node.numLinksOutOf() == 0 )
				Messages.addWarning(module+" has an unconnected output",node);
			break;
		case "dff_en":
			var en_error = getErrorsForModuleInputPort("_en",1,node);
			if (en_error)
				Messages.addError( en_error,node );
		case "dff":
			var D_error = getErrorsForModuleInputPort("_D",1,node);
			var clk_error =  getErrorsForModuleInputPort("_clk",1,node);
			if (D_error)
				Messages.addError( D_error,node );
			if (clk_error)
				Messages.addError( clk_error,node );
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
			for( var i=0; i<(1<<fanout_size); i++ ) {
				if( node.getLinks("out"+i,true).length == 0) {
					Messages.addWarning(module+" has an unconnected data output(s)",node);
					break;
				}
			}
			var in_error =  getErrorsForModuleInputPort("",(1<<fanout_size),node);
			if (in_error)
				Messages.addError( in_error,node );
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
				var error = getErrorsForModuleInputPort( i,1,node );
				var link = node.getLink('in'+i+'_w');
				if ( error )
					Messages.addError(error,node);		
			}
			break;
		//====================================================================================
		//	IMPORTED GROUP
		//====================================================================================
		// -Error of not all inputs are connected
		// -Error if name is invalid identifier
		// -Error if wrong size bus is connected on input
		default:
			var ports_sizes = getModulePortSizes(module);
			var ports = getModulePorts(module);
			if ( node.numLinksInto()<ports.input.length )
				Messages.addError(module + " has unconnected inputs",node);
			for (var i=0; i<ports_sizes.input.length; i++) {
				var link = node.getLink('in'+i+'_w',false);
				if ( link && link.size!=ports_sizes.input[i] )
					Messages.addError(module + " input ("+ports.input[i]+") has "+link.size+"\'b wire connected. Only "+ports_sizes.input[i]+"\'b wires may be connected",node);
			}
			for (var i=0; i<ports_sizes.output.length; i++) {
				var link = node.getLink('out'+i+'_e',true);
				if ( !link )
					Messages.addWarning(module + " has unconnected output ("+ports.output[i]+')',node);
			}
			nameError=schematic.getIDerror(module);
			if( nameError != "")
				Messages.addError(nameError,node);
			break;
		}
		
	},this);
	
	if( numOutputs===0 )
		Messages.addError("Schematic must have at least one connected output",null);
	return Messages;
};

schematic.prototype.getImportedComponentVerilog=function( module ){
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

schematic.prototype.getImportedComponentsForExport=function(){
	var graph=this.graph;
	nodes=graph.getChildVertices(graph.getDefaultParent());
	var components = new Set();
	if( nodes ) nodes.forEach(function(item){
		var style=graph.getCellStyle(item); 
		var module = style["shape"];
		if ( !schematic.isNativeComponent(module) ) 
			components.add( module );
	});
	return components;
}

schematic.prototype.getNativeComponentsForExport=function(){
	var graph=this.graph;
	nodes=this.graph.getChildVertices(graph.getDefaultParent());
	var components = new Set();
	var file_names={ mux2:"mux", mux4:"mux", mux8:"mux", mux16:"mux",
					decoder2:"decoder",decoder3:"decoder",decoder4:"decoder",
					dlatch:"d_latch",dlatch_en:"d_latch_en",dff:"dff",dff_en:"dff_en",srlatch:"sr_latch",srlatch_en:"sr_latch_en"
				};
	if( nodes ) nodes.forEach(function(node){
		var style=graph.getCellStyle(node); 
		var module = style["shape"];
		if (module in file_names)
			components.add(file_names[module]);
	});
	return components;
}

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
		if ( !schematic.isNativeComponent(module) && !storedShapesIncludes(module) ){
			cells.push(node);
		}
	});
	graph.removeCells(cells);
}

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
					mux2:"mux #(2)", mux4:"mux #(4)", mux8:"mux #(8)", mux16:"mux #(16)",
					decoder2:"decoder #(2)",decoder3:"decoder #(3)",decoder4:"decoder #(4)",
					dlatch:"d_latch",dlatch_en:"d_latch_en",dff:"dff",dff_en:"dff_en",srlatch:"sr_latch",srlatch_en:"sr_latch_en",
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
	function getModule( node ){
		return graph.getCellStyle( node )["shape"];
	}
	function getSrcPortID ( link ) {
		var port_object = /sourcePort=out([^_]*)/.exec(link.style);
		if ( port_object ) 
			return port_object[1];
	}
	function getTrgtPortID ( link ) {
		var port_object =  /targetPort=in([^_]*)/.exec(link.style);
		if ( port_object ) 
			return port_object[1];
	}
	function srcNodeIs( link, moduleName ){
		return getModule( link.source ).includes( moduleName );
	}
	function trgtNodeIs( link, moduleName ){
		return getModule( link.target ).includes( moduleName );
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
			if ( size>1 )
				link.value = size;
			else	
				link.value="";
			setCellStyleAttribute(link, 'strokeWidth', Math.log2(size)+1);
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
		case "mux16": 
		case "mux8":  
		case "mux4":  
		case "mux2":  
			var linksout=node.linksOutOf();
			if( linksout.length == 1 && trgtNodeIs(linksout[0], "outputport") ) 
				netAliases[netName(linksout[0])] = portName(linksout[0].target,"O");
			else
				wireSet[1].add(gateName(node,"X") );
			setLinkSetSize(linksout, 1);
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
			if ( !inputList.includes(portName(node,'I')) ) {
				if (inputport_size==0) 
					inputList+="\n\tinput " + portName(node,'I') +',';
				else
					inputList+="\n\tinput [" + ((1<<inputport_size)-1) + ':0] ' + portName(node,'I') +',';
			}
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
			if( link.length == 0 ){
				outputAssignList += "\nassign "+portName(node,"O")+" = " + (1<<outputport_size)+"\'b";
				for (var i=0; i<(1<<outputport_size); i++) {
					outputAssignList += "x" ;
				}
				outputAssignList += ";";
			}
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
			netList+=', ';
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
			netList += "\n\n" + gateNames[module] +' '+gateName(node,"U")+' ('; 
			netList=netList.replace(/, *$/gi, '');
			netList += '\n\t.data_out( ';
			var links=node.linksOutOf();
			if( links.length )
				netList += getNameOrAlias( links[0]);
			else
				netList += gateName(node,"X");
			netList=netList.replace(/, *$/gi, '');
			netList += ' ),\n\t.select_in( {';
			//iterate through each select input
			for( var i=mux_size-1; i>=0; i=i-1 )
			{
				var lnk=node.getLink( 'in_sel'+i,false);
				if( lnk ) 
					netList+=getNameOrAlias( lnk)+', ';
				else 
					netList+='1\'bx,';
			}	
			netList=netList.replace(/, *$/gi, '');
			netList=netList+"} ),\n\t.data_in( {";
			for( var i=(1<<mux_size)-1; i>=0; i-- )
			{
				var linki = node.getLink( 'in_'+i+'_',false);
				if( linki ) 
					netList += getNameOrAlias( linki) + ', ';
				else
					netList += "1\'bx, "
			}	
			netList=netList.replace(/, *$/gi, '');
			netList += "} )\n);";
			break; 
		case "dlatch":
			netList += "\n\n" + gateNames[module] + ' ' + gateName(node,"U") + " ("; 
			netList += '\n\t.data_out( ';
			var links=node.linksOutOf();
			if( links.length )
				netList += getNameOrAlias(links[0]);
			else
				netList += gateName(node,"X");
			netList += ' ),\n\t.in_D( ';
			{
				var lnk=node.getLink( 'in_D',false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
			}
			netList=netList+" ),\n\t.in_G( ";
			{
				var lnk=node.getLink( 'in_G',false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
			}
			netList=netList+" )\n);";
			break;
		case "srlatch":
			netList += "\n\n" + gateNames[module] + ' ' + gateName(node,"U") + " ("; 
			netList += '\n\t.data_out( ';
			var links=node.linksOutOf();
			if( links.length )
				netList += getNameOrAlias(links[0]);
			else
				netList += gateName(node,"X");
			netList += ' ),\n\t.in_S( ';
			{
				var lnk=node.getLink( 'in_S',false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
			}
			netList=netList+" ),\n\t.in_R( ";
			{
				var lnk=node.getLink( 'in_R',false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
			}
			netList=netList+" )\n);";
			break;
		case "srlatch_en":
			netList += "\n\n" + gateNames[module] + ' ' + gateName(node,"U") + " ("; 
			netList += '\n\t.data_out( ';
			var links=node.linksOutOf();
			if( links.length )
				netList += getNameOrAlias(links[0]);
			else
				netList += gateName(node,"X");
			netList += ' ),\n\t.in_S( ';
			{
				var lnk=node.getLink( 'in_S',false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
			}
			netList=netList+" ),\n\t.in_R( ";
			{
				var lnk=node.getLink( 'in_R',false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
			}
			netList=netList+" ),\n\t.in_EN( ";
			{
				var lnk=node.getLink( 'in_en',false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
			}
			netList=netList+" )\n);";
			break;
		case "dlatch_en":
			netList += "\n\n" + gateNames[module] + ' ' + gateName(node,"U") + " ("; 
			netList += '\n\t.data_out( ';
			var links=node.linksOutOf();
			if( links.length )
				netList += getNameOrAlias(links[0]);
			else
				netList += gateName(node,"X");
			netList += ' ),\n\t.in_D( ';
			{
				var lnk=node.getLink( 'in_D',false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
			}
			netList=netList+" ),\n\t.in_G( ";
			{
				var lnk=node.getLink( 'in_G',false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
			}
			netList=netList+" ),\n\t.in_EN( ";
			{
				var lnk=node.getLink( 'in_en',false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
			}
			netList=netList+" )\n);";
			break;
		case "dff":
			netList += "\n\n" + gateNames[module] + ' ' + gateName(node,"U") + " ("; 
			netList += '\n\t.data_out( ';
			var links=node.linksOutOf();
			if( links.length )
				netList += getNameOrAlias(links[0]);
			else
				netList += gateName(node,"X");
			netList += ' ),\n\t.in_D( ';
			{
				var lnk=node.getLink( 'in_D',false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
			}
			netList=netList+" ),\n\t.in_CLK( ";
			{
				var lnk=node.getLink( 'in_clk',false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
			}
			netList=netList+" )\n);";
			break;
		case "dff_en":
			netList += "\n\n" + gateNames[module] + ' ' + gateName(node,"U") + " ("; 
			netList += '\n\t.data_out( ';
			var links=node.linksOutOf();
			if( links.length )
				netList += getNameOrAlias(links[0]);
			else
				netList += gateName(node,"X");
			netList += ' ),\n\t.in_D( ';
			{
				var lnk=node.getLink( 'in_D',false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
			}
			netList=netList+" ),\n\t.in_CLK( ";
			{
				var lnk=node.getLink( 'in_clk',false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
			}
			netList=netList+" ),\n\t.in_EN( ";
			{
				var lnk=node.getLink( 'in_en',false);
				if( lnk ) netList+=getNameOrAlias(lnk);
				else netList+='1\'bx';
			}
			netList=netList+" )\n);";
			break;
		case "decoder4": decoder_size++;
		case "decoder3": decoder_size++;
		case "decoder2": decoder_size++;
			netList += "\n\n" + gateNames[module] + ' ' + gateName(node,"U") + " ("; 
			netList += '\n\t.data_out( {';
			for( var i=(1<<decoder_size)-1; i>=0; i=i-1 )
			{
				var lnk=node.getLink( 'out'+i+'_d',true);
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
			netList=netList.replace(/, *$/gi, '');
			netList=netList+"} ),\n\t.en_in(";
			var linken=node.getLink( 'in_en',false);
			if( linken ) 
				netList+=getNameOrAlias( linken );
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
		sel+= ckt.linkIsHigh(node.getLink("in_sel3")) ? 8 : 0;
	case "mux8":
		sel+= ckt.linkIsHigh(node.getLink("in_sel2")) ? 4 : 0;
	case "mux4":
		sel+= ckt.linkIsHigh(node.getLink("in_sel1")) ? 2 : 0;
	case "mux2":
		sel+= ckt.linkIsHigh(node.getLink("in_sel0")) ? 1 : 0;
		ckt.setGateOutput( node,ckt.linkIsHigh( node.getLink("in_"+sel+"_")));
		break;
	case "decoder4":
		sel+= ckt.linkIsHigh(node.getLink("in3_a")) ? 8 : 0;
	case "decoder3":
		sel+= ckt.linkIsHigh(node.getLink("in2_a")) ? 4 : 0;
	case "decoder2":
		sel+= ckt.linkIsHigh(node.getLink("in1_a")) ? 2 : 0;
		sel+= ckt.linkIsHigh(node.getLink("in0_a")) ? 1 : 0;
		ckt.setGateOutput( node,false);
		ckt.setGateOutput( node,ckt.linkIsHigh( node.getLink("in_en")),"out"+sel+'_d');
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
		if( !node.clkLast && ckt.linkIsHigh(node.getLink("in_clk")))
			ckt.setGateOutput( node,ckt.linkIsHigh( node.getLink("in_D")));
		node.clkLast = ckt.linkIsHigh( node.getLink("in_clk")) ;
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

