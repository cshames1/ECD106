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

})();
