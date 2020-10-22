
/**
 * Copyright (c) 2018, Douglas H. Summerville, Binghamton University
 * (see license.txt for attributions)
 * 
 * 
 * ===================		KEY		=======================================================================
 c =>	identifier for the shape object itself
 x =>	X coordinate of the shape no matter what size it is. 0 if left border, 1 is right border.
 y =>	Y coordinate of the shape no matter what size it is. 0 if top border, 1 is bottom border.
 w =>	Width of the full size shape when added to the canvas.
 h =>	Height of the full size shape when added to the canvas.
 
 '(i+.5)/(number_of_ports)' =>	Algorithm to evenly space the ith port along an axis.
 * ========================================================================================================
 */

(function()
{
	//read saved components from local storage
	var storedShapes = JSON.parse(localStorage.getItem('storedShapes'));
	if(storedShapes == null)
		storedShapes = []
	for (k = 0; k < storedShapes.length; k++) {
		function Shape()
		{
			mxActor.call(this);
		};
		mxUtils.extend(Shape, mxActor);

		//create the svg of the component
		Shape.prototype.redrawPath = new Function('c', 'x', 'y', 'w', 'h', "c.setStrokeColor('black');\
			c.setFontSize(8);\
			c.setFontStyle(mxConstants.FONT_BOLD);\
			c.begin();c.rect(0,0,w,h);c.fillAndStroke();\
			c.text(w/2,h/2,0,0,'"+storedShapes[k].componentName+"','center','middle');");

		//create component ports
		Shape.prototype.getPorts = new Function("var thisShape = "+JSON.stringify(storedShapes[k])+";\
			var n=thisShape.signals.input.length;\
			var s=thisShape.signals.output.length;\
			var ports=new Array();\
			for( var i=0; i<s; i++) {\
				ports['out' + i + '' + thisShape.signals.output[i] + '_e'] = {x: 1, y: [(i+1)/(1+s)], perimeter: false};\
			}\
			for( var i=0; i<n; i++ ) {\
				ports['in' + i + '' + thisShape.signals.input[i] + '_w'] = {x: 0, y: [(i+1)/(1+n)], perimeter: false};\
			}\
			return ports;");

		mxCellRenderer.registerShape(storedShapes[k].componentName, Shape);

	}
	
	//====================================================================================
	//	BASIC GATE GROUP
	//====================================================================================
	function InverterShape()
	{
		mxActor.call(this);
	};
	mxUtils.extend(InverterShape, mxActor);

	InverterShape.prototype.redrawPath = function(c, x, y, w, h)
	{
		c.moveTo(0,0);
		c.lineTo(0,h);
		c.lineTo(2*w/3,h/2);
		c.lineTo(0,0);
		c.close();
		c.fillAndStroke();
		c.ellipse(2*w/3,h/3,w/3,w/3);
		c.fillAndStroke();
		c.end();
	};

	InverterShape.prototype.getPorts = function()
	{
		var ports=new Array();
		ports['in1__w'] = {x: 0, y: 0.5, perimeter: true};
		ports['out__e'] = {x: 1, y: 0.5, perimeter: true};
		return ports;
	};
	mxCellRenderer.registerShape('inverter', InverterShape);
	

	function OrShape()
	{
		mxActor.call(this);
	};
	mxUtils.extend(OrShape, mxActor);

	OrShape.prototype.redrawPath = function(c, x, y, w, h)
	{
		c.moveTo(0,0);
		c.curveTo(w/2,0,3*w/4,0,w,h/2);
		c.curveTo(3*w/4,h,w/2,h,0,h);
		c.quadTo(w/2,h/2,0,0);
		c.end();
	};

	OrShape.prototype.getPorts = function()
	{
		var ports=new Array();
		ports['in1__w'] = {x: 0.095, y: 0.11, perimeter: false};
		ports['in2__w'] = {x: 0.17, y: 0.22, perimeter: false};
		ports['in3__w'] = {x: 0.22, y: 0.33, perimeter: false};
		ports['in4__w'] = {x: 0.248, y: 0.44, perimeter: false};
		ports['in5__w'] = {x: 0.248, y: 0.56, perimeter: false};
		ports['in6__w'] = {x: 0.22, y: 0.67, perimeter: false};
		ports['in7__w'] = {x: 0.17, y: 0.78, perimeter: false};
		ports['in8__w'] = {x: 0.095, y: 0.89, perimeter: false};
		ports['out__e'] = {x: 1, y: 0.5, perimeter: true};
		return ports;
	};
	mxCellRenderer.registerShape('or', OrShape);
	

	function NorShape()
	{
		mxActor.call(this);
	};
	mxUtils.extend(NorShape, mxActor);

	NorShape.prototype.redrawPath = function(c, x, y, w, h)
	{
		OrShape.prototype.redrawPath(c,x,y,3*w/4,h);
		c.fillAndStroke();
		c.ellipse(3*w/4,h/2-w/8,w/4,w/4);
		c.fillAndStroke();
	}

	NorShape.prototype.getPorts = function()
	{
		var ports=new Array();
		ports['in1__w'] = {x: 0.078, y: 0.11, perimeter: false};
		ports['in2__w'] = {x: 0.13, y: 0.22, perimeter: false};
		ports['in3__w'] = {x: 0.165, y: 0.33, perimeter: false};
		ports['in4__w'] = {x: 0.185, y: 0.44, perimeter: false};
		ports['in5__w'] = {x: 0.185, y: 0.56, perimeter: false};
		ports['in6__w'] = {x: 0.165, y: 0.67, perimeter: false};
		ports['in7__w'] = {x: 0.13, y: 0.78, perimeter: false};
		ports['in8__w'] = {x: 0.078, y: 0.89, perimeter: false};
		ports['out__e'] = {x: 1, y: 0.5, perimeter: true};
		return ports;
	} ;
	mxCellRenderer.registerShape('nor', NorShape);
	

	function AndShape()
	{
		mxActor.call(this);
	};
	mxUtils.extend(AndShape, mxActor);

	AndShape.prototype.redrawPath = function(c, x, y, w, h)
	{
		c.moveTo(0, 0);
		c.quadTo(w, 0, w, h / 2);
		c.quadTo(w, h, 0, h);
		c.close();
		c.end();
	};
			
	AndShape.prototype.getPorts = function()
	{
		var ports=new Array();
		ports['in1__w'] = {x: 0, y: 0.11, perimeter: true};
		ports['in2__w'] = {x: 0, y: 0.22, perimeter: true};
		ports['in3__w'] = {x: 0, y: 0.33, perimeter: true};
		ports['in4__w'] = {x: 0, y: 0.44, perimeter: true};
		ports['in5__w'] = {x: 0, y: 0.56, perimeter: true};
		ports['in6__w'] = {x: 0, y: 0.67, perimeter: true};
		ports['in7__w'] = {x: 0, y: 0.78, perimeter: true};
		ports['in8__w'] = {x: 0, y: 0.89, perimeter: true};
		ports['out__e'] = {x: 1, y: 0.5, perimeter: true};
		return ports;
	};
	mxCellRenderer.registerShape('and', AndShape);

	
	function NandShape()
	{
		mxActor.call(this);
	};
	mxUtils.extend(NandShape, mxActor);

	NandShape.prototype.redrawPath = function(c, x, y, w, h)
	{
		AndShape.prototype.redrawPath(c,x,y,3*w/4,h);
		c.fillAndStroke();
		c.ellipse(3*w/4,h/2-w/8,w/4,w/4);
		c.fillAndStroke();
	};

	NandShape.prototype.getPorts = function()
	{
		var ports=new Array();
		ports['in1__w'] = {x: 0, y: 0.11, perimeter: true};
		ports['in2__w'] = {x: 0, y: 0.22, perimeter: true};
		ports['in3__w'] = {x: 0, y: 0.33, perimeter: true};
		ports['in4__w'] = {x: 0, y: 0.44, perimeter: true};
		ports['in5__w'] = {x: 0, y: 0.56, perimeter: true};
		ports['in6__w'] = {x: 0, y: 0.67, perimeter: true};
		ports['in7__w'] = {x: 0, y: 0.78, perimeter: true};
		ports['in8__w'] = {x: 0, y: 0.89, perimeter: true};
		ports['out__e'] = {x: 1, y: 0.5, perimeter: true};
		return ports;
	};
	mxCellRenderer.registerShape('nand', NandShape);

	
	function XorShape()
	{
		mxActor.call(this);
	};
	mxUtils.extend(XorShape, mxActor);

	XorShape.prototype.redrawPath = function(c, x, y, w, h)
	{
		c.moveTo(0,h);
		c.quadTo(w/2,h/2,0,0);
		c.quadTo(w/2,h/2,0,h);
		c.moveTo( w/8, 0);
		c.curveTo(w/2,0,3*w/4,0,w,h/2);
		c.curveTo(3*w/4,h,w/2,h,w/8,h);
		c.quadTo(5*w/8,h/2,w/8,0);
		c.end();
	};

	XorShape.prototype.getPorts = function()
	{
		var ports=new Array();
		ports['in1__w'] = {x: 0.095, y: 0.11, perimeter: false};
		ports['in2__w'] = {x: 0.17, y: 0.22, perimeter: false};
		ports['in3__w'] = {x: 0.22, y: 0.33, perimeter: false};
		ports['in4__w'] = {x: 0.248, y: 0.44, perimeter: false};
		ports['in5__w'] = {x: 0.248, y: 0.56, perimeter: false};
		ports['in6__w'] = {x: 0.22, y: 0.67, perimeter: false};
		ports['in7__w'] = {x: 0.17, y: 0.78, perimeter: false};
		ports['in8__w'] = {x: 0.095, y: 0.89, perimeter: false};
		ports['out__e'] = {x: 1, y: 0.5, perimeter: true};
		return ports;
	};
	mxCellRenderer.registerShape('xor', XorShape);
	

	function XnorShape()
	{
		mxActor.call(this);
	};
	mxUtils.extend(XnorShape, mxActor);

	XnorShape.prototype.redrawPath = function(c, x, y, w, h)
	{
		XorShape.prototype.redrawPath(c,x,y,3*w/4,h);
		c.fillAndStroke();
		c.ellipse(3*w/4,h/2-w/8,w/4,w/4);
		c.fillAndStroke();
	};

	XnorShape.prototype.getPorts = function()
	{
		var ports=new Array();
		ports['in1__w'] = {x: 0.078, y: 0.11, perimeter: false};
		ports['in2__w'] = {x: 0.13, y: 0.22, perimeter: false};
		ports['in3__w'] = {x: 0.165, y: 0.33, perimeter: false};
		ports['in4__w'] = {x: 0.185, y: 0.44, perimeter: false};
		ports['in5__w'] = {x: 0.185, y: 0.56, perimeter: false};
		ports['in6__w'] = {x: 0.165, y: 0.67, perimeter: false};
		ports['in7__w'] = {x: 0.13, y: 0.78, perimeter: false};
		ports['in8__w'] = {x: 0.078, y: 0.89, perimeter: false};
		ports['out__e'] = {x: 1, y: 0.5, perimeter: true};
		return ports;
	};
	mxCellRenderer.registerShape('xnor', XnorShape);
	//====================================================================================
	//	END BASIC GATE GROUP
	//====================================================================================

	//====================================================================================
	//	MUX GROUP
	//====================================================================================
	var drawMux = function(n, c, x, y, w, h)
	{
		c.setStrokeColor('black');
		c.setFontSize(8);
		c.setFontStyle(mxConstants.FONT_BOLD);
		c.begin();
		c.moveTo(w / 2, h / 2);
		c.moveTo(0,0);
		c.lineTo( 0, h);
		c.lineTo( w, 3*h/4);
		c.lineTo( w, 1*h/4);
		c.close();
		c.fillAndStroke();
		c.text(w/2,h/2,0,0,'MUX\n'+n+'x1','center','middle');
	};
	var getMuxPorts=function(n,s)
	{
		var ports=new Array();
		for( var i=0; i<n; i=i+1)
		{
			ports['i'+ i + '_w'] = {x: 0, y: [(i+1)/(1+n)], perimeter: false};
			if( i < s )
			{
				var x= 1- (1+i)/ ((s<2) ? (1+s) : (2+s));
				var y=1-(.25*x);
				ports['sel'+i+'_s'] = {x: [x], y:[y] , perimeter: false};
			}
		}
		ports['out_o_e'] = {x: 1, y: 0.5, perimeter: true};
		return ports;
	};
	function MuxShape()
	{
		mxActor.call(this);
	};
	mxUtils.extend(MuxShape, mxActor);
	MuxShape.prototype.redrawPath = function(c, x, y, w, h)
	{
		var n=this.state.style["shape"].slice(3);
		drawMux(n,c,x,y,w,h);
	};
	MuxShape.prototype.getPorts = function()
	{
		var n=parseInt(this.state.style["shape"].substr(3),10);
		var s=Math.log2(n);
		return getMuxPorts(n,s);
	};
	mxCellRenderer.registerShape('mux2', MuxShape);
	mxCellRenderer.registerShape('mux4', MuxShape);
	mxCellRenderer.registerShape('mux8', MuxShape);
	mxCellRenderer.registerShape('mux16', MuxShape);
	//====================================================================================
	//	END MUX GROUP
	//====================================================================================

	//====================================================================================
	//	DECODER GROUP
	//====================================================================================
	var drawDecoder = function(n, c, x, y, w, h)
	{
		c.setStrokeColor('black');
		c.setFontSize(8);
		c.setFontStyle(mxConstants.FONT_BOLD);
		c.begin();
		c.rect(0,0,w,h);
		c.fillAndStroke();
		c.text(w/2,h/2,0,0,''+n+'-to-'+(1<<n)+'\nDecoder','center','middle');
	};
	var getDecoderPorts=function(n,s)
	{
		var ports=new Array();
		for( var i=0; i<s; i=i+1)
			ports['out'+(i+1)+'_d'+i+'_e'] = {x: 1, y: [(i+1)/(1+s)], perimeter: false};
		for( var i=0; i<n; i=i+1 )
			ports['in'+'_a'+i+'_w'] = {x: 0, y: [(i+1)/(1+s)], perimeter: false};
		ports['in_en_w']={x: 0, y: [s/(1+s)], perimeter:false};
		return ports;
	};

	function DecoderShape()
	{
		mxActor.call(this);
	};
	mxUtils.extend(DecoderShape, mxActor);
	DecoderShape.prototype.redrawPath = function(c, x, y, w, h)
	{
		var n=this.state.style["shape"].substr(-1);
		drawDecoder(n,c,x,y,w,h);
	};
	DecoderShape.prototype.getPorts = function()
	{
		var n=this.state.style["shape"].substr(-1);
		var s=(1<<n);
		return getDecoderPorts(n,s);
	};
	mxCellRenderer.registerShape('decoder2', DecoderShape);
	mxCellRenderer.registerShape('decoder3', DecoderShape);
	mxCellRenderer.registerShape('decoder4', DecoderShape);
	//====================================================================================
	//	END DECODER GROUP
	//====================================================================================

	//====================================================================================
	//	LATCH GROUP
	//====================================================================================
	function DLatchShape()
	{
		mxActor.call(this);
	};
	mxUtils.extend(DLatchShape, mxActor);
	DLatchShape.prototype.redrawPath = function(c, x, y, w, h)
	{
		var name= this.state.style["shape"].startsWith("dff")? "Flip-Flop" : "D-Latch";
		c.setStrokeColor('black');
		c.begin();
		c.rect(0,0,w,h);
		c.fillAndStroke();
		c.setFontSize(8);
		c.setFontStyle(mxConstants.FONT_BOLD);
		c.text(w/2,2*h/5,0,0,name,'center','middle');
	};
	DLatchShape.prototype.getPorts = function()
	{
		var ports=new Array();
		var style=this.state.style["shape"];
		var is_enable=style.endsWith("_en");
		var clock_name=style.startsWith("dff") ? ">" : "G";
		ports['in_D_w']={x: 0, y: 0.25, perimeter:false};
		ports['in_'+clock_name+'_w']={x: 0, y: 0.75, perimeter:false};
		ports['out_Q_e']={x: 1, y: 0.25, perimeter:false};
		if( is_enable )
			ports['in_en_w']={x: 0, y: 0.5, perimeter:false};
		return ports;
	};
	mxCellRenderer.registerShape('dlatch', DLatchShape);
	mxCellRenderer.registerShape('dlatch_en', DLatchShape);
	mxCellRenderer.registerShape('dff', DLatchShape);
	mxCellRenderer.registerShape('dff_en', DLatchShape);

	function SRLatchShape()
	{
		mxActor.call(this);
	};
	mxUtils.extend(SRLatchShape, mxActor);
	SRLatchShape.prototype.redrawPath = function(c, x, y, w, h)
	{
		var name= "SR-Latch";
		c.setStrokeColor('black');
		c.begin();
		c.rect(0,0,w,h);
		c.fillAndStroke();
		c.setFontSize(8);
		c.setFontStyle(mxConstants.FONT_BOLD);
		c.text(w/2,2*h/5,0,0,name,'center','middle');
	};
	SRLatchShape.prototype.getPorts = function()
	{
		var ports=new Array();
		var style=this.state.style["shape"];
		var is_enable=style.endsWith("_en");
		ports['in_S_w']={x: 0, y: 0.25, perimeter:false};
		ports['in_R_w']={x: 0, y: 0.75, perimeter:false};
		ports['out_Q_e']={x: 1, y: 0.25, perimeter:false};
		if( is_enable )
			ports['in_en_w']={x: 0, y: 0.5, perimeter:false};
		return ports;
	};
	mxCellRenderer.registerShape('srlatch', SRLatchShape);
	mxCellRenderer.registerShape('srlatch_en', SRLatchShape);
	//====================================================================================
	//	END LATCH GROUP
	//====================================================================================

	//====================================================================================
	//	BUS GROUP
	//====================================================================================
	var drawBusDecoder = function(n, c, x, y, w, h)
	{
		c.setStrokeColor('black');
		c.setFontSize(8);
		c.setFontStyle(mxConstants.FONT_BOLD);
		c.begin();
		c.rect(0,0,w,h);
		c.fillAndStroke();
		c.text(w/2,h/2,0,0,''+1+'-to-'+n+'\nBus \nDecoder','center','middle');
	};

	function BusDecoderShape()
	{
		mxActor.call(this);
	};
	mxUtils.extend(BusDecoderShape, mxActor);

	BusDecoderShape.prototype.redrawPath = function(c, x, y, w, h)
	{
		var n=this.state.style["shape"].slice(10);
		drawBusDecoder(n,c,x,y,w,h);
	};

	BusDecoderShape.prototype.getPorts = function()
	{
		var number_of_wires=this.state.style["shape"].slice(10);
		return getBusDecoderPorts(number_of_wires)
	};

	var getBusDecoderPorts=function(number_of_wires)
	{
		var ports=new Array();
		ports['in_w'] = {x: 0, y: .5, perimeter: false};
		for( var i=0; i<number_of_wires; i=i+1 )
			ports['out'+ i + '_d'+i+'_e'] = {x: 1, y: (i+.5)/(number_of_wires), perimeter: false};
		return ports;
	};


	var drawBusEncoder = function(n, c, x, y, w, h)
	{
		c.setStrokeColor('black');
		c.setFontSize(8);
		c.setFontStyle(mxConstants.FONT_BOLD);
		c.begin();
		c.rect(0,0,w,h);
		c.fillAndStroke();
		c.text(w/2,h/2,0,0,''+n+'-to-'+1+'\nBus \nEncoder','center','middle');
	};

	function BusEncoderShape()
	{
		mxActor.call(this);
	};
	mxUtils.extend(BusEncoderShape, mxActor);

	BusEncoderShape.prototype.redrawPath = function(c, x, y, w, h)
	{
		var n=this.state.style["shape"].slice(10);
		drawBusEncoder(n,c,x,y,w,h);
	};

	BusEncoderShape.prototype.getPorts = function()
	{
		var number_of_wires=this.state.style["shape"].slice(10);
		return getBusEncoderPorts(number_of_wires)
	};

	var getBusEncoderPorts=function(number_of_wires)
	{
		var ports=new Array();
		for( var i=0; i<number_of_wires; i=i+1 )
			ports['in'+i + '__w'] = {x: 0, y: (i+.5)/(number_of_wires) , perimeter: false};
		ports['out_e'] = {x: 1, y: .5, perimeter: false};
		return ports;
	};

	mxCellRenderer.registerShape('busdecoder2', BusDecoderShape);
	mxCellRenderer.registerShape('busencoder2', BusEncoderShape);
	mxCellRenderer.registerShape('busdecoder4', BusDecoderShape);
	mxCellRenderer.registerShape('busencoder4', BusEncoderShape);
	mxCellRenderer.registerShape('busdecoder8', BusDecoderShape);
	mxCellRenderer.registerShape('busencoder8', BusEncoderShape);
	mxCellRenderer.registerShape('busdecoder16', BusDecoderShape);
	mxCellRenderer.registerShape('busencoder16', BusEncoderShape);
	mxCellRenderer.registerShape('busdecoder32', BusDecoderShape);
	mxCellRenderer.registerShape('busencoder32', BusEncoderShape);
	//====================================================================================
	//	END BUS GROUP
	//====================================================================================


	//====================================================================================
	//	MISC GROUP
	//====================================================================================
	function InputPortShape()
	{
		mxActor.call(this);
	};
	mxUtils.extend(InputPortShape, mxActor);
	InputPortShape.prototype.redrawPath = function(c, x, y, w, h)
	{
		c.moveTo(0,0);
		c.lineTo(7*w/8,0);
		c.lineTo(w,h/2);
		c.lineTo(7*w/8,h);
		c.lineTo(7*w/8,h);
		c.lineTo(0,h);
		c.close();
		c.end();
	};
	InputPortShape.prototype.getPorts = function()
	{
		var ports=new Array();
		ports['out_e'] = {x: 1, y: 0.5, perimeter: true};
		return ports;
	};
	mxCellRenderer.registerShape('inputport', InputPortShape);

	function OutputPortShape()
	{
		mxActor.call(this);
	};
	mxUtils.extend(OutputPortShape, mxActor);
	OutputPortShape.prototype.redrawPath = function(c, x, y, w, h)
	{
		c.moveTo(0,h/2);
		c.lineTo(w/8,h);
		c.lineTo(w,h);
		c.lineTo(w,0);
		c.lineTo(w/8,0);
		c.lineTo(0,h/2);
		c.close();
		c.end();
	};
	OutputPortShape.prototype.getPorts = function()
	{
		var ports=new Array();
		ports['in_w'] = {x: 0, y: 0.5, perimeter: true};
		return ports;
	};
	mxCellRenderer.registerShape('outputport', OutputPortShape);

	
	//-------------------- CONSTANTS --------------------
	function ConstantShape() { mxEllipse.call(this); };
	mxUtils.extend(ConstantShape, mxEllipse);
	ConstantShape.prototype.getPorts = function()
	{
		var ports=new Array();
		ports['out0__n'] = {x: 0.5, y: 0.0, perimeter: true};
		ports['out1__e'] = {x: 1.0, y: 0.5, perimeter: true};
		ports['out2__s'] = {x: 0.5, y: 1.0, perimeter: true};
		ports['out3__w'] = {x: 0.0, y: 0.5, perimeter: true};
		return ports;
	};
	function ConstantZeroShape(){ ConstantShape.call(this);};
	mxUtils.extend(ConstantZeroShape, ConstantShape);
	mxCellRenderer.registerShape('constant0', ConstantZeroShape);
	function ConstantOneShape(){ ConstantShape.call(this);};
	mxUtils.extend(ConstantOneShape, ConstantShape);
	mxCellRenderer.registerShape('constant1', ConstantOneShape);

	function BufferShape()
	{
		mxActor.call(this);
	};
	mxUtils.extend(BufferShape, mxActor);
	BufferShape.prototype.redrawPath = function(c, x, y, w, h)
	{
		c.moveTo(0,0);
		c.lineTo(0.67*w,h/2);
		c.lineTo(0,h);
		c.close();
		c.fillAndStroke();
		c.end();
	};
	BufferShape.prototype.getPorts = function()
	{
		var ports=new Array();
		ports['in1__w'] = {x: 0, y: 0.5, perimeter: true};
		ports['out__e'] = {x: 0.67, y: 0.5, perimeter: false};
		return ports;
	};
	mxCellRenderer.registerShape('buffer', BufferShape);

	//====================================================================================
	//	END MISC GROUP
	//====================================================================================
})();
