// -- Meghana Jain, Binghamton University
// -- Digital Logic Design / Sophomore Design

module sr_latch (
	input in_S, in_R,
	output data_out
	);

	wire wire_NOR_S, wire_NOR_R;
	nor NOR_S(wire_NOR_S, in_S, wire_NOR_R);
	nor NOR_R(wire_NOR_R, in_R, wire_NOR_S);
	
	assign data_out = wire_NOR_R;

endmodule