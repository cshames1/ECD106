module top_level (
	input I5,
	input [1:0] I8,
	input [15:0] I10,
	input [3:0] I14,
	input [1:0] I17,
	input [1:0] I27,
	output [15:0] O11
);


wire [3:0] X15;
wire [1:0] X12, X22;
assign O11 = 1'bx;

mux16 #(2) U12 (
	.i9(I17), 
	.sel( {1'bx,1'bx,1'bx,1'bx}),
	.q(X12)
);

mux2 #(4) U15 (
	.i0(I14), 
	.sel( {1'bx}),
	.q(X15)
);

decoder #(4,1) U18 (
	.data_out( {1'bx, 1'bx, 1'bx, 1'bx, 1'bx, 1'bx, 1'bx, 1'bx, 1'bx, 1'bx, 1'bx, 1'bx, 1'bx, 1'bx, 1'bx, 1'bx} ),
	.address_in( {X22[1], X22[0], 1'bx, 1'bx} ),
	.en_in( 1'bx)
);

decoder #(3,1) U19 (
	.data_out( {1'bx, 1'bx, 1'bx, 1'bx, 1'bx, 1'bx, 1'bx, 1'bx} ),
	.address_in( {1'bx, 1'bx, 1'bx} ),
	.en_in( 1'bx)
);

decoder #(2,1) U20 (
	.data_out( {1'bx, 1'bx, 1'bx, 1'bx} ),
	.address_in( {1'bx, 1'bx} ),
	.en_in( 1'bx)
);

register_en #(2) U22 (
	.data_in(I27),
	.q(X22)
);

endmodule
