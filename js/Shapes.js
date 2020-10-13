/**
 * Copyright (c) 2018, Douglas H. Summerville, Binghamton University
 * (see license.txt for attributions)
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
		Shape.prototype.redrawPath = new Function('c', 'x', 'y', 'w', 'h', "c.setStrokeColor('black');c.setFontSize(8);\
		c.setFontStyle(mxConstants.FONT_BOLD);c.begin();c.rect(0,0,w,h);c.fillAndStroke();c.text(w/2,h/2,0,0,'"+storedShapes[k].componentName+"','center','middle');");

		//create component ports
		Shape.prototype.getPorts = new Function("var thisShape = "+JSON.stringify(storedShapes[k])+"; var n=thisShape.signals.input.length; var s=thisShape.signals.output.length; var ports=new Array(); for( var i=0; i<s; i++) { ports[thisShape.signals.output[i]] = {x: 1, y: [(i+1)/(1+s)], perimeter: false}; } for( var i=0; i<n; i++ ) { ports[thisShape.signals.input[i]] = {x: 0, y: [(i+1)/(1+n)], perimeter: false}; } return ports;")

		mxCellRenderer.registerShape(storedShapes[k].componentName, Shape);

	}

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

	//constants
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

})();


//Decoder Group
var drawBusDecoder = function(n, c, x, y, w, h)
{
	c.setStrokeColor('black');
	c.setFontSize(8);
	c.setFontStyle(mxConstants.FONT_BOLD);
	c.begin();
	c.rect(0,0,w,h);
	c.fillAndStroke();
	c.text(w/2,h/2,0,0,''+1+'-to-'+n+'\nBus','center','middle');
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
	ports['Bus In'] = {x: 0, y: .5, perimeter: false};
	for( var i=0; i<number_of_wires; i=i+1 )
		ports['Wire '+i] = {x: 1, y: (i+.5)/(number_of_wires), perimeter: false};
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
	c.text(w/2,h/2,0,0,''+n+'-to-'+1+'\nBus','center','middle');
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
		ports['Wire '+i] = {x: 0, y: (i+.5)/(number_of_wires) , perimeter: false};
	ports['Bus Out'] = {x: 1, y: .5, perimeter: false};
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