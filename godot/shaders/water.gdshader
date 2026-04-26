shader_type canvas_item;

uniform float current_strength : hint_range(0.0, 0.12) = 0.035;
uniform float ripple_strength : hint_range(0.0, 0.06) = 0.018;
uniform vec4 foam_color : source_color = vec4(0.86, 0.98, 1.0, 0.08);

void fragment() {
	vec2 uv = UV;
	float drift = sin((uv.y * 24.0) + TIME * 0.9) * current_strength;
	uv.x += drift;
	uv.y += sin((uv.x * 18.0) + TIME * 1.6) * ripple_strength;

	vec4 base = texture(TEXTURE, uv);
	float band = smoothstep(0.45, 0.55, sin((uv.y * 36.0) - TIME * 2.0));
	float shimmer = smoothstep(0.55, 0.95, sin((uv.x * 50.0) + (uv.y * 22.0) + TIME * 2.4));
	base.rgb += foam_color.rgb * band * foam_color.a;
	base.rgb += vec3(0.08, 0.14, 0.16) * shimmer * 0.18;
	COLOR = base;
}
