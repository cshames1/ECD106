/**
 * Copyright (c) 2018, Douglas H. Summerville, Binghamton University
 * Updated by 2021 [ECD106] Charlie Shames, Thomas Nicolino, Ben Picone, Joseph Luciano; Advisor: Meghana Jain
 */

class schematic
{
	constructor(graph) {
		this.graph = graph;
		this.maxPortnameLength=20;
		this.verilog="";
	}

	//Returns true if component is built in to DSD
	static isNativeComponent( component ){
		var nativeComponents=["and", "nand", "or","nor","xor","xnor","buf", "inverter",
						"mux","mux2","mux4", "mux8","mux16",
						"decoder","decoder2","decoder3","decoder4", 
						"dff", "dff_en", "srlatch", "srlatch_en", "dlatch", "dlatch_en", 
						"fanIn2",  "fanIn4",  "fanIn8",  "fanIn16",  "fanIn32",
						"fanOut2",  "fanOut4", "fanOut8", "fanOut16", "fanOut32",
						"inputport1", "inputport2", "inputport4", "inputport8", "inputport16", "inputport32",
						"outputport1", "outputport2", "outputport4", "outputport8", "outputport16", "outputport32",
						"constant0", "constant1" ];
		return nativeComponents.includes( component );
	}; 

	//Returns true if DSD has a Verilog file for component
	static DSDhasVFile( component ){
		var vfiles = ['d_latch_en','d_latch','decoder','dff_en','dff','sr_latch_en','sr_latch','mux'];
		return vfiles.includes(component);
	};

	//Returns true if str is a reserved word in Verilog
	static isVerilogReserved( str ){
		var verilogReserved=new Set( ["always", "ifnone", "rpmos", "and", "initial", "rtran", "assign", "inout", "rtranif0", "begin", "input", "rtranif1", "buf", "integer", "scalared", "bufif0", "join", "small", "bufif1", "large", "specify", "case", "macromodule", "specparam", "casex", "medium", "strong0", "casez", "module", "strong1", "cmos", "nand", "supply0", "deassign", "negedge", "supply1", "default", "nmos", "table", "defparam", "nor", "task", "disable", "not", "time", "edge", "notif0", "tran", "else", "notif1", "tranif0", "end", "or", "tranif1", "endcase", "output", "tri", "endmodule", "parameter", "tri0", "endfunction", "pmos", "tri1", "endprimitive", "posedge", "triand", "endspecify", "primitive", "trior", "endtable", "pull0", "trireg", "endtask", "pull1", "vectored", "event", "pullup", "wait", "for", "pulldown", "wand", "force", "rcmos", "weak0", "forever", "real", "weak1", "fork", "realtime", "while", "function", "reg", "wire", "highz0", "release", "wor", "highz1", "repeat", "xnor", "if", "rnmos", "xor"]);
		return verilogReserved.has(str);
	};

	//Returns true if newstr is a valid Verilog identifier
	static isValidID( newstr ){
		return (this.getIDerror(newstr)=="" );
	};

	//Returns error message with description of problem if newstr is not a valid Verilog identifier, otherwise blank string
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

	//Returns true if newstr is stored in imported components, unless its index matches ID
	static isImportedComponent( newstr, id ){
		var storedShapes = JSON.parse(localStorage.getItem('storedShapes'));
		if (storedShapes) for (var i=0; i<storedShapes.length; i++) {
			if(id!=i && newstr==storedShapes[i].componentName )
				return true;
		}
		return false;
	};

	//Returns set of all components that will require seperate Verilog files to synthesize
	static getVFilesFor( verilog ){
		var verilogNoComments = schematic.removeVerilogComments(verilog);
		var vfiles = new Set();
		var componentInstantiations = verilogNoComments.split(';');
		for (var i=0; i<componentInstantiations.length; i++) {
			componentInstantiations[i] = componentInstantiations[i].trim();
			var component = componentInstantiations[i].split(' ')[0];
			if ( !schematic.isVerilogReserved(component) ) {
				vfiles.add(component);
				if (schematic.isImportedComponent(component) ) {
					var exportComponents = schematic.getVFilesFor( schematic.getImportedComponentVerilog(component) );
					exportComponents.forEach(function(component){vfiles.add(component);});
				}
			}
		}
		return vfiles;
	};

	//Removes all comments from rawVerilog 
	static removeVerilogComments( rawVerilog ){
		var newText = "";
		const stateType = {
			NORMAL_CODE:'normal_code',
			COMMENT_TYPE1:'comment_type1',//this type: //comment
			COMMENT_TYPE2:'comment_type2'//this type: /* comment */
		}
		let state = stateType.NORMAL_CODE;
		for (var i=0; i<rawVerilog.length; i++) {
			switch (state){
				case stateType.NORMAL_CODE:
					if ( (rawVerilog[i]+rawVerilog[i+1])=='//' ) 
						state = stateType.COMMENT_TYPE1;
					else if ( (rawVerilog[i]+rawVerilog[i+1])=='/*' ) 
						state = stateType.COMMENT_TYPE2;
					else
						newText += rawVerilog[i];
					break;
				case stateType.COMMENT_TYPE1:
					if ( rawVerilog[i]=='\n' )
						state = stateType.NORMAL_CODE;
					break;
				case stateType.COMMENT_TYPE2:
					if ( (rawVerilog[i-1]+rawVerilog[i])=='*/' ) 
						state = stateType.NORMAL_CODE;
					break;
			}
		}
		return newText;
	};

	//Adds a new component to the imported component library
	static addComponent( verilog,compName,xml ){
		function getPortSize (line){
			if (line.includes('[')) {
				var port_size = line.split('[')[1];
				port_size = parseInt(port_size.split(':')[0]);
				return port_size+1;
			}
			return 1;
		}
		if ( verilog=="")
			return;

		var signals = {input:[], output:[]};
		var signalSize = {input:[], output:[]};

		var verilogNoComments = schematic.removeVerilogComments( verilog );
		var portInstantiations = "";
		var index = verilogNoComments.indexOf('(')+1;
		while (verilogNoComments[index]!=')') {
			portInstantiations += verilogNoComments[index++];
		}
		
		var lastPortType;
		var lastPortSize;
		var tokens = portInstantiations.split(',');
		if (tokens) tokens.forEach(function(token){

			if ( token.includes('input') ){
				lastPortType = 'input';
				lastPortSize = getPortSize( token );
			}
			else if ( token.includes('output') ) {
				lastPortType = 'output';
				lastPortSize = getPortSize( token );
			}
			var trimmedToken = token.trim();
			var words = trimmedToken.split(' ');
			var port_name = words[words.length-1];
			
			signals[lastPortType].push(port_name.trim());
			signalSize[lastPortType].push(lastPortSize);
		});
		
		var storedShapes = JSON.parse(localStorage.getItem('storedShapes'));
		if( storedShapes==null )
			storedShapes = new Array();
		if ( signals['input'].length>0 && signals['output'].length>0) {
			storedShapes.push({
				"componentName":compName.replace(".v", ""),
				"signals":signals,
				"signal_size":signalSize,
				"verilogCode":verilog,
				"xml":xml
			});
		}
		localStorage.setItem('storedShapes', JSON.stringify(storedShapes));
		location.reload();
	};

	//Returns Verilog code stored as attribute of module
	static getImportedComponentVerilog( module ){
		function getModuleVerilog( moduleName ) {
			var storedShapes = JSON.parse(localStorage.getItem('storedShapes'));
			var currentModule="";
			if ( storedShapes ) storedShapes.forEach(function(shape){
				if (shape.componentName==moduleName) currentModule = shape;
			});
			return currentModule.verilogCode;
		}
		function get_module_name( verilog ) {
			var verilogNoCommnents = schematic.removeVerilogComments(verilog);
			var tokens = verilogNoCommnents.split(' ');
			var i=0;
			while ( !tokens[i++].includes('module') );
			while ( tokens[i++]=='' );
			var name = tokens[i-1];
			if (name.includes('('))
				name = name.substring(0, name.indexOf('(') )
			return name;
		}
		var importedVerilog = getModuleVerilog( module );	
		var oldName =  get_module_name( importedVerilog );
		
		var new_code = importedVerilog.split(oldName).join(module);
		return new_code;
	};

	//Returns error messsage describing problem if newstr is not a valid identifier according to DSD's requirements
	static checkPortName(newstr){
		var checkIdError = schematic.getIDerror(newstr);
		if ( checkIdError )
			return checkIdError;
		if( /^[UX].*$/.test(newstr) )
			return "Error ("+newstr+"): Port names cannot start with uppercase U or X";
		return "";
	};
	
}

/* function: runDRC
	- Runs all Design Rule Checks on the schematic
	- Returns DRCMessages object with information about its warnings and errors
*/
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
	function getErrorsForModuleInputPort( port_flag, bitWidth, node ){
		port_flag = port_flag.toString();
		var link = node.getLink( "in"+port_flag,false );
		var module = getModule( node );
		var warning = "";
		port_flag = port_flag.replace('_', '');
		if( link==null )
			warning += module+" input "+((port_flag)?"(":"")+port_flag+((port_flag)?")":"")+" must be connected";
		else if ( bitWidth && link.size!=bitWidth )
			warning += module+" input "+((port_flag)?"(":"")+port_flag+((port_flag)?")":"")+" has a "+link.size+"\'b wire connected. Only "+bitWidth+"\'b wires may be connected";
		return warning;
	}
	var Messages=new DRCMessages;

	nodes=graph.getChildVertices(graph.getDefaultParent());
	nodes.forEach(function(node){
		var muxSize=0;
		var outputSize=0;
		var decoderSize=1;
		var fanoutSize=0;
		var faninSize=0;
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
				portnameError=schematic.checkPortName(node.value);
				if( portnameError != "")
					Messages.addError(portnameError,node);
			}
			if( output_identifiers.has(node.value))
				Messages.addError("Port name "+node.value+ " is used on output(s) and input(s)",node);
			if( node.value != "" ) 
				input_identifiers.add(node.value);
			break;
		case "outputport32": outputSize++;
		case "outputport16": outputSize++;
		case "outputport8":  outputSize++;
		case "outputport4":  outputSize++;
		case "outputport2":  outputSize++;
		case "outputport1":  
			numOutputs++;
			if( node.value == "" )
				Messages.addWarning(module+" is unnamed: a default name will be provided",node);
			else
			{
				portnameError=schematic.checkPortName(node.value);
				if( portnameError != "")
					Messages.addError(portnameError,node);
			}
			if( input_identifiers.has(node.value))
				Messages.addError("Port name "+node.value+ " is used on input(s) and output(s)",node);
			if( output_identifiers.has(node.value))
				Messages.addError("Port name "+node.value+ " is used on multiple outputs",node);
			if( node.value != "" ) 
				output_identifiers.add(node.value);
			var inError =  getErrorsForModuleInputPort("",(1<<outputSize),node);
			if (inError)
				Messages.addError( inError,node );
			break;
		//====================================================================================
		//	BASIC GATE GROUP
		//====================================================================================
		case "buffer":
		case "inverter": 
			if( node.numLinksOutOf() == 0 )
				Messages.addWarning(module+" has an unconnected output",node);
			var inError =  getErrorsForModuleInputPort("",1,node);
			if (inError)
				Messages.addError( inError,node );
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
		case "mux16": muxSize++;
		case "mux8":  muxSize++;
		case "mux4":  muxSize++;
		case "mux2":  muxSize++;
			var dataInputConnected = (1<<muxSize);
			for (var i=0; i<muxSize; i++) {
				var sel_error = getErrorsForModuleInputPort("_sel"+i,1,node);
				if (sel_error)
					Messages.addError(sel_error,node);
			}
			if( dataInputConnected < (1<<muxSize))
				Messages.addError("All "+module+" data (i) inputs must be connected",node);
			if( node.numLinksOutOf()==0 )
				Messages.addWarning(module+" has unconnected output",node);
			for (var i=0; i<(1<<muxSize); i++) {
				var inError = getErrorsForModuleInputPort("_"+i,1,node);
				if (inError)
					Messages.addError(inError,node);
			}
			break;
		//====================================================================================
		//	DECODER GROUP
		//====================================================================================
		case "decoder4": decoderSize++;
		case "decoder3": decoderSize++;
		case "decoder2": decoderSize++;
			for (var i=0; i<decoderSize; i++){
				var inError = getErrorsForModuleInputPort(i,1,node);
				if (inError)
					Messages.addError(inError,node);
			}
			var enError = getErrorsForModuleInputPort('_en',1,node);
			if (enError)
				Messages.addError(enError,node);
			for( var i=0; i<(1<<decoderSize); i++ ) {
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
			var enError = getErrorsForModuleInputPort("_en",1,node);
			if (enError)
				Messages.addError( enError,node );
		case "srlatch":
			var sError = getErrorsForModuleInputPort("_S",1,node);
			var RError =  getErrorsForModuleInputPort("_R",1,node);
			if (sError)
				Messages.addError( sError,node );
			if (RError)
				Messages.addError( RError,node );
			if( node.numLinksOutOf() == 0 )
				Messages.addWarning(module+" has an unconnected output",node);
			break;
		case "dlatch_en":
			var enError = getErrorsForModuleInputPort("_en",1,node);
			if (enError)
				Messages.addError( enError,node );
		case "dlatch":
			var GError = getErrorsForModuleInputPort("_D",1,node);
			var G_error =  getErrorsForModuleInputPort("_G",1,node);
			if (GError)
				Messages.addError( GError,node );
			if (G_error)
				Messages.addError( G_error,node );
			if( node.numLinksOutOf() == 0 )
				Messages.addWarning(module+" has an unconnected output",node);
			break;
		case "dff_en":
			var enError = getErrorsForModuleInputPort("_en",1,node);
			if (enError)
				Messages.addError( enError,node );
		case "dff":
			var GError = getErrorsForModuleInputPort("_D",1,node);
			var clkError =  getErrorsForModuleInputPort("_clk",1,node);
			if (GError)
				Messages.addError( GError,node );
			if (clkError)
				Messages.addError( clkError,node );
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
		case "fanOut32": fanoutSize++;
		case "fanOut16": fanoutSize++;
		case "fanOut8":  fanoutSize++;
		case "fanOut4":	 fanoutSize++;
		case "fanOut2":  fanoutSize++;
			for( var i=0; i<(1<<fanoutSize); i++ ) {
				if( node.getLinks("out"+i,true).length == 0) {
					Messages.addWarning(module+" has an unconnected data output(s)",node);
					break;
				}
			}
			var inError =  getErrorsForModuleInputPort("",(1<<fanoutSize),node);
			if (inError)
				Messages.addError( inError,node );
			break;
		// -Warning if not all inputs are connected
		// -Error if output is not connected
		// -Error if no inputs are connected
		// -Error if input is not a 1-bit wire
		case "fanIn32":	faninSize++;
		case "fanIn16":	faninSize++;
		case "fanIn8":  faninSize++;
		case "fanIn4":  faninSize++;
		case "fanIn2":  faninSize++;
			if ( node.numLinksOutOf() == 0)
				Messages.addError(module+" output is unconnected",node);
			if( node.numLinksInto() == 0 )
				Messages.addError(module+" has no connected inputs",node);
			else if( node.numLinksInto() < (1<<faninSize) )
				Messages.addWarning(module+" has " + ((1<<faninSize)-node.numLinksInto()) + " unconnected inputs",node);
			for (var i=0; i<(1<<faninSize); i++) {
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
			var portSizes = getModulePortSizes(module);
			var ports = getModulePorts(module);
			if ( node.numLinksInto()<ports.input.length )
				Messages.addError(module + " has unconnected inputs",node);
			for (var i=0; i<portSizes.input.length; i++) {
				var link = node.getLink('in'+i+'_w',false);
				if ( link && link.size!=portSizes.input[i] )
					Messages.addError(module + " input ("+ports.input[i]+") has "+link.size+"\'b wire connected. Only "+portSizes.input[i]+"\'b wires may be connected",node);
			}
			for (var i=0; i<portSizes.output.length; i++) {
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
	if( numInputs===0 )
		Messages.addWarning("Schematic must have at least one connected input",null);
	return Messages;
};

/* function: deleteClearedComponents
	- When editing the component library, users may remove components that have already been placed in the workspace
	- Removes all such components from the workspace when the user's edits are saved
	- Returns nothing
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
		if ( !schematic.isNativeComponent(module) && !storedShapesIncludes(module) ){
			cells.push(node);
		}
	});
	graph.removeCells(cells);
}

/* function: getVerilog
	- Updates schematic
	- Returns the verilog code stored in the schematic's verilog attribute
*/
schematic.prototype.getVerilog=function()
{
	this.updateSchematic();
	return this.verilog;
}

/* function: updateSchematic
	- Creates or updates Verilog code and stores it in the schematic's verilog attribute
	- Defines bit width of all wires in schematic
	- Refreshes schematic in workspace	
	- Returns nothing
*/
schematic.prototype.updateSchematic=function()
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
		var tryInputPortName = netAliases[netName(link)] ;
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
		else if ( tryInputPortName )
			alias += tryInputPortName;
		else if (netName(link))
			alias += netName(link);
		return alias;
	}
	function getModule( node ){
		return graph.getCellStyle( node )["shape"];
	}
	function getSrcPortID ( link ) {
		var portObject = /sourcePort=out([^_]*)/.exec(link.style);
		if ( portObject ) 
			return portObject[1];
	}
	function getTrgtPortID ( link ) {
		var portObject =  /targetPort=in([^_]*)/.exec(link.style);
		if ( portObject ) 
			return portObject[1];
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
	function sortNodes ( unsortedNodes ) {
		var sortedNodes = new Set();
		if ( unsortedNodes) unsortedNodes.forEach(function(node){
			var module = getModule( node );
			if ( module.includes("inputport") || !(module in gateNames) || module.includes("fanIn") )
				sortedNodes.add( node );
		});
		if ( unsortedNodes) unsortedNodes.forEach(function(node){
			var module = getModule( node );
			if ( !module.includes("inputport") && (module in gateNames) && !module.includes("fanIn") )
				sortedNodes.add( node );
		});
		return sortedNodes;
	}
	function setCellStyleAttribute( cell, attribute, value ){
		var newStyle ="";
		var style = cell["style"];
		if ( style.includes(attribute) ) {
			style_array = style.split(";");
			style_array.forEach(function(token){
				if ( token.includes(attribute) )
					newStyle += attribute+"="+value+";";
				else if (token)
					newStyle += token+";";
			});
		}
		else
			newStyle += style+attribute+"="+value+";";
		cell["style"] = newStyle;
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

	//Iterates through all components and renames nets accordingly if any constants or user defined identifiers are used
	function defineNetAliases(){
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
	}

	//Defines bitwidth and aliases of all wires
	function mapNetlist(){
		if( nodes ) nodes.forEach(function(node){
			var decoderSize=1;
			var faninSize=0;
			var inputPortSize=0;
			var module = getModule( node );
			switch( module )
			{
				case "inputport32": inputPortSize++;
				case "inputport16": inputPortSize++;
				case "inputport8":  inputPortSize++;
				case "inputport4":  inputPortSize++;
				case "inputport2":  inputPortSize++;
				case "inputport1":
					var linksout=node.linksOutOf();
					setLinkSetSize(linksout, (1<<inputPortSize));
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
				case "decoder4": decoderSize++;
				case "decoder3": decoderSize++;
				case "decoder2": decoderSize++;
					for( var i=0; i<(1<<decoderSize); i=i+1 )
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
				case "fanIn32": faninSize++;
				case "fanIn16": faninSize++;
				case "fanIn8":  faninSize++;
				case "fanIn4":  faninSize++;
				case "fanIn2":  faninSize++;
					var linksout=node.linksOutOf();
					if( linksout.length == 1 && trgtNodeIs(linksout[0], "outputport") ) 
						netAliases[netName(linksout[0])] = portName(linksout[0].target,"O");
					setLinkSetSize(linksout, (1<<faninSize));
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
	}

	//Creates Verilog code from the schematic
	function createVerilog(){
		if( nodes )
		nodes.forEach(function(node){
			var muxSize=0;
			var faninSize = 0;
			var inputportSize=0;
			var outputportSize=0;
			var decoderSize=1;
			var module = getModule(node);
			switch( module )
			{
				case "constant0":
				case "constant1":
					break;
				case "inputport32": inputportSize++;
				case "inputport16": inputportSize++;
				case "inputport8":  inputportSize++;
				case "inputport4":  inputportSize++;
				case "inputport2":  inputportSize++;
				case "inputport1":
					if ( !inputList.includes(portName(node,'I')) ) {
						if (inputportSize==0) 
							inputList+="\n\tinput " + portName(node,'I') +',';
						else
							inputList+="\n\tinput [" + ((1<<inputportSize)-1) + ':0] ' + portName(node,'I') +',';
					}
					break;
				case "outputport32": outputportSize++;
				case "outputport16": outputportSize++;
				case "outputport8":  outputportSize++;
				case "outputport4":  outputportSize++;
				case "outputport2":  outputportSize++;
				case "outputport1":
					if (outputportSize==0)
						outputList+="\n\toutput " + portName(node,'O') + ',';
					else
						outputList+="\n\toutput [" + ((1<<outputportSize)-1) + ':0] ' + portName(node,'O') +',';
					var link=node.linksInto();
					if( link.length == 0 ){
						outputAssignList += "\nassign "+portName(node,"O")+" = " + (1<<outputportSize)+"\'b";
						for (var i=0; i<(1<<outputportSize); i++) {
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
				case "mux16": muxSize++;
				case "mux8":  muxSize++;
				case "mux4":  muxSize++;
				case "mux2":  muxSize++;
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
					for( var i=muxSize-1; i>=0; i=i-1 )
					{
						var lnk=node.getLink( 'in_sel'+i,false);
						if( lnk ) 
							netList+=getNameOrAlias( lnk)+', ';
						else 
							netList+='1\'bx,';
					}	
					netList=netList.replace(/, *$/gi, '');
					netList=netList+"} ),\n\t.data_in( {";
					for( var i=(1<<muxSize)-1; i>=0; i-- )
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
				case "decoder4": decoderSize++;
				case "decoder3": decoderSize++;
				case "decoder2": decoderSize++;
					netList += "\n\n" + gateNames[module] + ' ' + gateName(node,"U") + " ("; 
					netList += '\n\t.data_out( {';
					for( var i=(1<<decoderSize)-1; i>=0; i=i-1 )
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
					for( var i=decoderSize-1; i>=0; i=i-1 )
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
				case "fanIn32": faninSize++;
				case "fanIn16": faninSize++;
				case "fanIn8":  faninSize++;
				case "fanIn4":  faninSize++;
				case "fanIn2":  faninSize++;
					var assignment = "";
					var links=node.linksOutOf();
					if(links.length == 1 && trgtNodeIs(links[0], "outputport") ) 
						assignment += "\nassign "+getNameOrAlias( links[0]) +' = { ';
					else
						assignment += "\nwire ["+((1<<faninSize)-1)+":0] "+gateName(node,"X")+" = { ";
					for( var i=(1<<faninSize)-1; i>=0; i=i-1 )
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
	}
	//nodes must be sorted so any module which can determine a wire's bit width is processed before modules that can't
	var nodes = sortNodes( graph.getChildVertices(graph.getDefaultParent()) );
	
	defineNetAliases();
	mapNetlist();
	createVerilog();
	
	//refresh the graph because wires' bit widths may have changed
	graph.refresh();
	
	//storees verilog code in the schematic's verilog attribute
	this.verilog = verilogCode;
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

