// -- Meghana Jain, Binghamton University
// -- Digital Logic Design / Sophomore Design

module sr_latch_en (
	input in_S, in_R, in_EN,
	output data_out
	);

	wire wire_NOR_S, wire_NOR_R, wire_AND_S, wire_AND_R;
	and AND_S (wire_AND_S, in_S, in_EN);
	and AND_R (wire_AND_R, in_R, in_EN);
	nor NOR_S(wire_NOR_S, wire_AND_S, wire_NOR_R);
	nor NOR_R(wire_NOR_R, wire_AND_R, wire_NOR_S);
	
	assign data_out = wire_NOR_R;

endmodule