// -- Meghana Jain, Binghamton University
// -- Digital Logic Design / Sophomore Design

module d_latch_en (
	input in_D, in_G, in_EN,
	output reg data_out
	);
	
	always @ (*)
		if(in_G & in_EN)
			data_out<=in_D;

endmodule