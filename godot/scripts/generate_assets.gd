extends SceneTree

const ASSET_DIR := "res://assets/"
const SCALE := 4


func _init() -> void:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(ASSET_DIR))
	_generate_anglers()
	_generate_fish()
	_generate_shark()
	_generate_splashes()
	_generate_water_base()
	quit()


func _generate_anglers() -> void:
	var image := Image.create(64 * 4, 96, false, Image.FORMAT_RGBA8)
	image.fill(Color(0, 0, 0, 0))

	var palettes := [
		{"hat": Color("1a2e3c"), "shirt": Color("253846"), "shorts": Color("e58b57"), "skin": Color("f0c57c"), "boots": Color("49594f")},
		{"hat": Color("355265"), "shirt": Color("607d54"), "shorts": Color("c87456"), "skin": Color("d8b183"), "boots": Color("445349")},
		{"hat": Color("33263d"), "shirt": Color("405f73"), "shorts": Color("d7a24e"), "skin": Color("d4a174"), "boots": Color("4d5558")},
		{"hat": Color("2d3f28"), "shirt": Color("6a6744"), "shorts": Color("a06a4c"), "skin": Color("e0b787"), "boots": Color("4d5148")},
	]

	for i in range(palettes.size()):
		_draw_angler_frame(image, Vector2i(i * 64, 0), palettes[i])

	image.save_png(ProjectSettings.globalize_path(ASSET_DIR + "anglers_sheet.png"))


func _generate_fish() -> void:
	var species_colors := [
		Color8(216, 216, 201), Color8(196, 222, 234), Color8(216, 229, 239), Color8(186, 209, 175), Color8(141, 210, 233),
		Color8(221, 202, 118), Color8(200, 217, 226), Color8(167, 215, 238), Color8(215, 232, 136), Color8(159, 197, 218),
	]
	var image := Image.create(48 * species_colors.size(), 24, false, Image.FORMAT_RGBA8)
	image.fill(Color(0, 0, 0, 0))

	for i in range(species_colors.size()):
		_draw_fish_frame(image, Vector2i(i * 48, 0), species_colors[i])

	image.save_png(ProjectSettings.globalize_path(ASSET_DIR + "fish_sheet.png"))


func _generate_shark() -> void:
	var image := Image.create(96, 32, false, Image.FORMAT_RGBA8)
	image.fill(Color(0, 0, 0, 0))
	var c := Color("5f7a86")
	_fill_rect(image, Rect2i(18, 12, 36, 10), c)
	_fill_rect(image, Rect2i(10, 14, 8, 6), c)
	_fill_rect(image, Rect2i(54, 13, 10, 8), c)
	_fill_rect(image, Rect2i(66, 10, 12, 12), c)
	_fill_rect(image, Rect2i(30, 6, 10, 6), c.darkened(0.15))
	_fill_rect(image, Rect2i(32, 14, 16, 2), c.lightened(0.12))
	_fill_rect(image, Rect2i(28, 20, 18, 2), Color("89a8b2"))
	_fill_rect(image, Rect2i(20, 10, 10, 2), c.darkened(0.28))
	_fill_rect(image, Rect2i(46, 15, 2, 2), Color("2c3940"))
	image.save_png(ProjectSettings.globalize_path(ASSET_DIR + "shark_sheet.png"))
	var fin := Image.create(96, 32, false, Image.FORMAT_RGBA8)
	fin.fill(Color(0, 0, 0, 0))
	_fill_triangle(fin, Vector2i(40, 2), Vector2i(70, 22), Vector2i(18, 26), Color("334751"))
	_fill_rect(fin, Rect2i(10, 24, 58, 2), Color("8db8c2", 0.55))
	_fill_rect(fin, Rect2i(18, 26, 42, 2), Color("d3f2fb", 0.38))
	fin.save_png(ProjectSettings.globalize_path(ASSET_DIR + "shark_fin.png"))


func _generate_splashes() -> void:
	var image := Image.create(64, 32, false, Image.FORMAT_RGBA8)
	image.fill(Color(0, 0, 0, 0))
	for i in range(4):
		var cx := 8 + i * 16
		_fill_rect(image, Rect2i(cx, 10, 2, 10), Color("d7f2fb"))
		_fill_rect(image, Rect2i(cx - 2, 14, 2, 6), Color("d7f2fb"))
		_fill_rect(image, Rect2i(cx + 2, 14, 2, 6), Color("d7f2fb"))
		_fill_rect(image, Rect2i(cx - 5, 19, 12, 2), Color("d7f2fb"))
		_fill_rect(image, Rect2i(cx - 6, 23, 14, 2), Color("a4dcea"))
	image.save_png(ProjectSettings.globalize_path(ASSET_DIR + "splash_sheet.png"))


func _generate_water_base() -> void:
	var image := Image.create(256, 256, false, Image.FORMAT_RGBA8)
	image.fill(Color("3e9bb0"))
	for y in range(256):
		var ratio := float(y) / 255.0
		var c := Color("3e9bb0").lerp(Color("164d6f"), ratio)
		for x in range(256):
			image.set_pixel(x, y, c)
	for y in range(0, 256, 24):
		for x in range(0, 256, 32):
			for dx in range(16):
				if x + dx < 256:
					image.set_pixel(x + dx, y + int((x / 32) % 2), Color(0.86, 0.97, 0.99, 0.16))
	for y in range(0, 256, 20):
		for x in range(0, 256, 48):
			_fill_rect(image, Rect2i(x, y + 6, 18, 2), Color(0.78, 0.94, 0.98, 0.10))
	for x in range(0, 256, 18):
		var y0 := int(120 + sin(float(x) * 0.16) * 18.0)
		for step in range(6):
			if y0 + step >= 0 and y0 + step < 256 and x + step < 256:
				image.set_pixel(x + step, y0 + step, Color(0.86, 0.98, 1.0, 0.08))
	image.save_png(ProjectSettings.globalize_path(ASSET_DIR + "water_base.png"))


func _draw_angler_frame(image: Image, origin: Vector2i, palette: Dictionary) -> void:
	_fill_rect(image, Rect2i(origin.x + 28, origin.y + 12, 8, 8), palette.skin)
	_fill_rect(image, Rect2i(origin.x + 24, origin.y + 8, 16, 4), palette.hat)
	_fill_rect(image, Rect2i(origin.x + 26, origin.y + 6, 12, 2), palette.hat.lightened(0.12))
	_fill_rect(image, Rect2i(origin.x + 20, origin.y + 16, 24, 4), palette.hat)
	_fill_rect(image, Rect2i(origin.x + 20, origin.y + 24, 24, 20), palette.shirt)
	_fill_rect(image, Rect2i(origin.x + 16, origin.y + 30, 8, 22), palette.shirt)
	_fill_rect(image, Rect2i(origin.x + 44, origin.y + 28, 8, 24), palette.shirt)
	_fill_rect(image, Rect2i(origin.x + 24, origin.y + 26, 16, 2), palette.shirt.lightened(0.2))
	_fill_rect(image, Rect2i(origin.x + 22, origin.y + 44, 20, 14), palette.shorts)
	_fill_rect(image, Rect2i(origin.x + 24, origin.y + 58, 6, 22), palette.skin.darkened(0.04))
	_fill_rect(image, Rect2i(origin.x + 34, origin.y + 58, 6, 22), palette.skin.darkened(0.06))
	_fill_rect(image, Rect2i(origin.x + 22, origin.y + 80, 8, 4), palette.boots)
	_fill_rect(image, Rect2i(origin.x + 32, origin.y + 80, 8, 4), palette.boots)
	_fill_rect(image, Rect2i(origin.x + 18, origin.y + 34, 4, 16), palette.shirt.darkened(0.1))
	_fill_rect(image, Rect2i(origin.x + 42, origin.y + 34, 4, 18), palette.shirt.darkened(0.1))
	_fill_rect(image, Rect2i(origin.x + 30, origin.y + 20, 2, 2), Color("262626"))
	_draw_line(image, Vector2i(origin.x + 46, origin.y + 48), Vector2i(origin.x + 62, origin.y + 12), Color("6a4b2e"))
	_draw_line(image, Vector2i(origin.x + 48, origin.y + 48), Vector2i(origin.x + 63, origin.y + 11), Color("fff6d6"))


func _draw_fish_frame(image: Image, origin: Vector2i, body: Color) -> void:
	_fill_triangle(image, origin + Vector2i(4, 12), origin + Vector2i(20, 4), origin + Vector2i(20, 20), body)
	_fill_rect(image, Rect2i(origin.x + 20, origin.y + 6, 16, 12), body)
	_fill_triangle(image, origin + Vector2i(36, 12), origin + Vector2i(44, 6), origin + Vector2i(44, 18), body)
	_fill_triangle(image, origin + Vector2i(24, 6), origin + Vector2i(32, 2), origin + Vector2i(30, 8), body.lightened(0.12))
	_fill_rect(image, Rect2i(origin.x + 24, origin.y + 8, 10, 2), body.lightened(0.2))
	_fill_rect(image, Rect2i(origin.x + 34, origin.y + 10, 2, 2), Color("324a55"))


func _fill_rect(image: Image, rect: Rect2i, color: Color) -> void:
	var start_x := maxi(0, rect.position.x)
	var start_y := maxi(0, rect.position.y)
	var end_x := mini(image.get_width(), rect.position.x + rect.size.x)
	var end_y := mini(image.get_height(), rect.position.y + rect.size.y)
	for y in range(start_y, end_y):
		for x in range(start_x, end_x):
			image.set_pixel(x, y, color)


func _draw_line(image: Image, from: Vector2i, to: Vector2i, color: Color) -> void:
	var points := Geometry2D.bresenham_line(from, to)
	for point in points:
		if point.x >= 0 and point.x < image.get_width() and point.y >= 0 and point.y < image.get_height():
			image.set_pixel(point.x, point.y, color)


func _fill_triangle(image: Image, a: Vector2i, b: Vector2i, c: Vector2i, color: Color) -> void:
	var points := PackedVector2Array([a, b, c])
	var bounds := Rect2i(a, Vector2i.ZERO).expand(b).expand(c)
	for y in range(bounds.position.y, bounds.end.y + 1):
		for x in range(bounds.position.x, bounds.end.x + 1):
			if Geometry2D.is_point_in_polygon(Vector2(x, y), points):
				if x >= 0 and x < image.get_width() and y >= 0 and y < image.get_height():
					image.set_pixel(x, y, color)
