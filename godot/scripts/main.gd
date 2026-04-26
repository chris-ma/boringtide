extends Node2D

enum GameMode { TITLE, PLAYING, END_SCREEN }
enum LureState { IDLE, CASTING, RETRIEVING, HOOKED, PHOTO }

const VIEW_SIZE := Vector2(900, 1400)
const WATERLINE_Y := 180.0
const SHORE_Y := 1260.0
const SESSION_SECONDS := 150.0
const ANGLER_SCALE := 6.0
const FISH_COUNT := 18
const SCHOOL_COUNT := 5
const ANGLER_FRAME_SIZE := Vector2(64, 96)
const FISH_FRAME_SIZE := Vector2(48, 24)
const SPLASH_FRAME_SIZE := Vector2(16, 32)

const FISH_TABLE := [
	{"species": "Australian Salmon", "min": 1.2, "max": 4.8, "color": Color8(216, 216, 201), "score": 1},
	{"species": "Tailor", "min": 0.8, "max": 2.9, "color": Color8(196, 222, 234), "score": 1},
	{"species": "Bonito", "min": 1.8, "max": 5.5, "color": Color8(216, 229, 239), "score": 2},
	{"species": "Yellowtail Kingfish", "min": 4.5, "max": 14.2, "color": Color8(186, 209, 175), "score": 3},
	{"species": "Tuna", "min": 6.5, "max": 18.5, "color": Color8(141, 210, 233), "score": 4},
	{"species": "Mackerel", "min": 1.4, "max": 6.4, "color": Color8(221, 202, 118), "score": 2},
	{"species": "Trevally", "min": 2.0, "max": 8.0, "color": Color8(200, 217, 226), "score": 2},
	{"species": "Queenfish", "min": 3.5, "max": 10.8, "color": Color8(167, 215, 238), "score": 3},
	{"species": "Dolphinfish", "min": 5.0, "max": 15.0, "color": Color8(215, 232, 136), "score": 4},
	{"species": "Cobia", "min": 7.0, "max": 19.0, "color": Color8(159, 197, 218), "score": 4},
]

const SPECIES_WEIGHTS := [20, 20, 16, 8, 4, 12, 10, 5, 3, 2]

var mode: int = GameMode.TITLE
var lure_state: int = LureState.IDLE
var elapsed := 0.0
var session_index := 0
var session_time_left := SESSION_SECONDS
var shoreline_profile: Array[Vector2] = []
var current_direction := 1.0
var current_strength := 34.0
var wave_seed := 0.0
var title_button_rect := Rect2(270, 1112, 360, 78)

var pointer_down := false
var hold_boost := false
var hold_time := 0.0
var pointer_position := Vector2.ZERO

var player := {}
var side_anglers: Array[Dictionary] = []
var schools: Array[Dictionary] = []
var fish_list: Array[Dictionary] = []
var shark := {}
var lure := {}
var splashes: Array[Dictionary] = []
var hooked_fight: Dictionary = {}
var photo_moment: Dictionary = {}

var stats := {
	"catches": 0,
	"total_weight": 0.0,
	"best_weight": 0.0,
	"best_fish": "",
	"shark_chance": 0.05,
}

var message_text := "Tap the water to cast"
var catch_species := "No fish yet"
var catch_weight := 0.0
var hype_timer := 0.0
var fight_hype_text := ""
var presented_mode := -1
var angler_atlas: Texture2D
var fish_atlas: Texture2D
var shark_atlas: Texture2D
var shark_fin_atlas: Texture2D
var splash_atlas: Texture2D
var water_texture: Texture2D

@onready var water_fx: Sprite2D = $WaterFX
@onready var camera_2d: Camera2D = $Camera2D
@onready var sea_mist: GPUParticles2D = $AmbientFX/SeaMist
@onready var surface_sparkles: GPUParticles2D = $AmbientFX/SurfaceSparkles
@onready var hookup_burst: GPUParticles2D = $AmbientFX/HookupBurst
@onready var scene_animations: AnimationPlayer = $UI/SceneAnimations
@onready var hud: Control = $UI/HUD
@onready var tide_panel: Panel = $UI/HUD/TidePanel
@onready var timer_label: Label = $UI/HUD/TidePanel/TimerLabel
@onready var tide_bar_fill: ColorRect = $UI/HUD/TidePanel/TideBarFill
@onready var catch_label: Label = $UI/HUD/CatchLabel
@onready var stats_label: Label = $UI/HUD/StatsLabel
@onready var message_panel: Panel = $UI/HUD/MessagePanel
@onready var message_label: Label = $UI/HUD/MessagePanel/MessageLabel
@onready var title_screen: Control = $UI/TitleScreen
@onready var title_panel: Panel = $UI/TitleScreen/TitlePanel
@onready var title_label: Label = $UI/TitleScreen/TitlePanel/TitleLabel
@onready var tagline_label: Label = $UI/TitleScreen/TitlePanel/TaglineLabel
@onready var instructions_panel: Panel = $UI/TitleScreen/TitlePanel/InstructionsPanel
@onready var start_button: Button = $UI/TitleScreen/TitlePanel/StartButton
@onready var hero_rect: TextureRect = $UI/TitleScreen/TitlePanel/Hero
@onready var end_screen: Control = $UI/EndScreen
@onready var end_panel: Panel = $UI/EndScreen/EndPanel
@onready var end_title: Label = $UI/EndScreen/EndPanel/EndTitle
@onready var end_stats: Label = $UI/EndScreen/EndPanel/EndStats
@onready var photo_flash: ColorRect = $UI/PhotoFlash


func _ready() -> void:
	randomize()
	_load_runtime_textures()
	_initialize_characters()
	start_button.pressed.connect(_start_session)
	title_screen.mouse_filter = Control.MOUSE_FILTER_STOP
	hero_rect.texture = angler_atlas
	hero_rect.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	water_fx.texture = water_texture
	water_fx.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	_configure_particles()
	_apply_ui_skin()
	_build_scene_animations()
	_play_title_intro()
	_reset_to_title()
	set_process(true)


func _process(delta: float) -> void:
	elapsed += delta

	if pointer_down:
		hold_time += delta
		hold_boost = hold_time > 0.16
	else:
		hold_time = 0.0
		hold_boost = false

	match mode:
		GameMode.TITLE:
			_update_title(delta)
		GameMode.PLAYING:
			_update_playing(delta)
		GameMode.END_SCREEN:
			_update_end(delta)

	_sync_ui()
	_update_water_shader()
	queue_redraw()


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion:
		pointer_position = event.position

	if event is InputEventMouseButton:
		pointer_position = event.position
		if event.button_index == MOUSE_BUTTON_LEFT:
			pointer_down = event.pressed
			if event.pressed:
				_handle_press(event.position)
			else:
				hold_boost = false

	if event is InputEventKey and event.pressed:
		if mode == GameMode.TITLE and event.keycode == KEY_ENTER:
			_start_session()
		elif mode == GameMode.END_SCREEN and event.keycode == KEY_ENTER:
			_start_session()


func _handle_press(pos: Vector2) -> void:
	match mode:
		GameMode.TITLE:
			pass
		GameMode.END_SCREEN:
			_start_session()
		GameMode.PLAYING:
			if lure_state == LureState.HOOKED or lure_state == LureState.PHOTO:
				return
			if lure_state == LureState.RETRIEVING:
				lure.velocity += Vector2(randf_range(-18.0, 18.0), randf_range(-12.0, 12.0))
				message_text = "Twitch!"
				return
			if lure_state == LureState.IDLE and pos.y < SHORE_Y - 12.0:
				_cast_lure(pos)


func _draw() -> void:
	_draw_sky()
	_draw_ocean()
	_draw_shoreline()
	_draw_fish()
	_draw_shark()
	_draw_anglers()
	_draw_lure_and_line()
	_draw_splashes()
	_draw_vignette()


func _initialize_characters() -> void:
	player = {
		"base_x": VIEW_SIZE.x * 0.46,
		"pos": Vector2(VIEW_SIZE.x * 0.46, SHORE_Y - 120.0),
		"shirt": Color("253846"),
		"shorts": Color("e58b57"),
		"hat": Color("1a2e3c"),
		"flip": false,
		"yell": "",
		"yell_timer": 0.0,
	}

	side_anglers = [
		{
			"base_x": VIEW_SIZE.x * 0.24,
			"pos": Vector2(VIEW_SIZE.x * 0.24, SHORE_Y - 126.0),
			"shirt": Color("607d54"),
			"shorts": Color("c87456"),
			"hat": Color("355265"),
			"flip": false,
			"state": "waiting",
			"timer": 0.9,
			"lure": Vector2.ZERO,
			"cast_origin": Vector2.ZERO,
			"cast_target": Vector2.ZERO,
			"cast_duration": 0.4,
			"progress": 0.0,
			"cheer": "",
			"cheer_timer": 0.0,
		},
		{
			"base_x": VIEW_SIZE.x * 0.74,
			"pos": Vector2(VIEW_SIZE.x * 0.74, SHORE_Y - 132.0),
			"shirt": Color("405f73"),
			"shorts": Color("d7a24e"),
			"hat": Color("33263d"),
			"flip": true,
			"state": "waiting",
			"timer": 1.5,
			"lure": Vector2.ZERO,
			"cast_origin": Vector2.ZERO,
			"cast_target": Vector2.ZERO,
			"cast_duration": 0.45,
			"progress": 0.0,
			"cheer": "",
			"cheer_timer": 0.0,
		},
	]

	lure = {
		"pos": Vector2.ZERO,
		"start": Vector2.ZERO,
		"target": Vector2.ZERO,
		"progress": 0.0,
		"velocity": Vector2.ZERO,
	}

	shark = {
		"pos": Vector2(VIEW_SIZE.x * 0.2, WATERLINE_Y + 120.0),
		"dir": 1.0,
		"speed": 58.0,
		"turn_timer": 0.8,
	}


func _reset_to_title() -> void:
	mode = GameMode.TITLE
	session_time_left = SESSION_SECONDS
	message_text = "Tap Start Casting"
	catch_species = "No fish yet"
	catch_weight = 0.0
	hooked_fight.clear()
	photo_moment.clear()
	splashes.clear()
	_play_title_intro()
	_generate_environment()


func _start_session() -> void:
	mode = GameMode.PLAYING
	session_index += 1
	session_time_left = SESSION_SECONDS
	elapsed = 0.0
	message_text = "Tide is running"
	stats = {
		"catches": 0,
		"total_weight": 0.0,
		"best_weight": 0.0,
		"best_fish": "",
		"shark_chance": 0.05,
	}
	catch_species = "No fish yet"
	catch_weight = 0.0
	splashes.clear()
	hooked_fight.clear()
	photo_moment.clear()
	_generate_environment()
	_spawn_fish()
	_reset_side_anglers()
	lure_state = LureState.IDLE
	lure.pos = player.pos + Vector2(0, -24)
	lure.target = lure.pos
	lure.velocity = Vector2.ZERO
	hype_timer = 0.0
	fight_hype_text = ""
	_play_hookup_pulse(false)


func _end_session(shark_loss: bool) -> void:
	mode = GameMode.END_SCREEN
	lure_state = LureState.IDLE
	message_text = "Shark hooked. Session over." if shark_loss else "Tide window ended."


func _generate_environment() -> void:
	current_direction = [-1.0, 1.0].pick_random()
	current_strength = randf_range(26.0, 46.0)
	wave_seed = randf_range(0.0, TAU)
	shoreline_profile = _generate_shoreline()
	player.pos = Vector2(player.base_x, _swim_boundary_y(player.base_x) + 18.0)
	lure.pos = player.pos + Vector2(0, -24)
	shark.pos = Vector2(randf_range(120.0, 300.0), WATERLINE_Y + randf_range(140.0, 320.0))
	shark.dir = [-1.0, 1.0].pick_random()
	shark.speed = randf_range(48.0, 72.0)
	shark.turn_timer = randf_range(0.9, 1.8)


func _reset_side_anglers() -> void:
	for i in range(side_anglers.size()):
		var angler := side_anglers[i]
		angler.pos = Vector2(angler.base_x, _swim_boundary_y(angler.base_x) + 22.0)
		angler.cast_origin = angler.pos + Vector2(-10.0 if angler.flip else 10.0, -18.0)
		angler.lure = angler.cast_origin
		angler.cast_target = angler.cast_origin
		angler.state = "waiting"
		angler.timer = 0.8 + i * 0.7
		angler.progress = 0.0
		angler.cast_duration = randf_range(0.34, 0.52)
		angler.cheer = ""
		angler.cheer_timer = 0.0
		side_anglers[i] = angler


func _spawn_fish() -> void:
	schools.clear()
	fish_list.clear()

	for i in range(SCHOOL_COUNT):
		var heading := randf_range(-PI, PI)
		schools.append({
			"x": randf_range(90.0, VIEW_SIZE.x - 90.0),
			"y": randf_range(WATERLINE_Y + 70.0, SHORE_Y - 240.0),
			"heading": heading,
			"target_heading": heading,
			"speed": randf_range(24.0, 68.0),
			"turn_timer": randf_range(0.8, 2.2),
			"spread": randf_range(45.0, 110.0),
		})

	for i in range(FISH_COUNT):
		var species_index := _pick_weighted_index(SPECIES_WEIGHTS)
		var school_index := randi_range(0, schools.size() - 1)
		var school: Dictionary = schools[school_index]
		var scale := randf_range(0.82, 1.35)
		fish_list.append({
			"species_index": species_index,
			"school_index": school_index,
			"pos": Vector2(
				school.x + randf_range(-school.spread, school.spread),
				school.y + randf_range(-24.0, 24.0)
			),
			"dir": 1.0,
			"scale": scale,
			"interest": randf_range(0.3, 0.95),
			"size": randf_range(18.0, 34.0) * scale,
			"depth": randf(),
			"wiggle": randf_range(0.0, TAU),
			"offset_x": randf_range(-school.spread, school.spread),
			"offset_y": randf_range(-24.0, 24.0),
			"offset_drift": randf_range(-0.8, 0.8),
			"hooked": false,
			"alpha": 0.2 + randf() * 0.16,
		})


func _update_title(_delta: float) -> void:
	if not start_button.has_focus():
		start_button.grab_focus()


func _update_end(_delta: float) -> void:
	pass


func _update_playing(delta: float) -> void:
	session_time_left = max(0.0, session_time_left - delta)
	if session_time_left <= 0.0 and mode == GameMode.PLAYING:
		_end_session(false)
		return

	_update_side_anglers(delta)
	_update_schools(delta)
	_update_fish(delta)
	_update_shark(delta)
	_update_lure(delta)
	_update_splashes(delta)
	_update_character_yells(delta)
	_update_ambient_fx(delta)


func _update_character_yells(delta: float) -> void:
	player.yell_timer = max(0.0, player.yell_timer - delta)
	for i in range(side_anglers.size()):
		var angler := side_anglers[i]
		angler.cheer_timer = max(0.0, angler.cheer_timer - delta)
		side_anglers[i] = angler


func _update_side_anglers(delta: float) -> void:
	if photo_moment.has("active"):
		return

	for i in range(side_anglers.size()):
		var angler := side_anglers[i]
		angler.timer -= delta

		if angler.state == "waiting" and angler.timer <= 0.0:
			angler.state = "casting"
			angler.progress = 0.0
			angler.cast_duration = randf_range(0.34, 0.52)
			var dir := -1.0 if angler.flip else 1.0
			var target_x := clampf(angler.pos.x + dir * randf_range(90.0, 190.0), 60.0, VIEW_SIZE.x - 60.0)
			var target_y := clampf(
				WATERLINE_Y + randf_range(120.0, 300.0),
				WATERLINE_Y + 48.0,
				_swim_boundary_y(target_x) - 110.0
			)
			angler.cast_target = Vector2(target_x, target_y)
		elif angler.state == "casting":
			angler.progress = min(1.0, angler.progress + delta / angler.cast_duration)
			var arc := sin(angler.progress * PI) * 44.0
			angler.lure = angler.cast_origin.lerp(angler.cast_target, angler.progress) - Vector2(0, arc)
			if angler.progress >= 1.0:
				angler.state = "holding"
				angler.timer = randf_range(0.4, 1.1)
				_add_splash(angler.lure, 6, Color("d7f2fb"))
		elif angler.state == "holding":
			if randf() < 0.08:
				_add_ripple(angler.lure + Vector2(0, 6), randf_range(3.0, 6.0))
			if angler.timer <= 0.0:
				angler.state = "retrieving"
				angler.timer = randf_range(0.7, 1.2)
		elif angler.state == "retrieving":
			angler.lure = angler.lure.lerp(angler.cast_origin, delta * 1.8)
			if randf() < 0.12:
				_add_ripple(angler.lure + Vector2(0, 4), randf_range(2.0, 4.0))
			if angler.lure.distance_to(angler.cast_origin) < 12.0:
				angler.state = "waiting"
				angler.timer = randf_range(1.3, 3.4)
				angler.lure = angler.cast_origin

		side_anglers[i] = angler


func _update_schools(delta: float) -> void:
	for i in range(schools.size()):
		var school := schools[i]
		school.turn_timer -= delta
		if school.turn_timer <= 0.0:
			school.turn_timer = randf_range(0.9, 2.4)
			school.target_heading += randf_range(-1.4, 1.4)
			school.speed = randf_range(24.0, 68.0)

		school.heading = rotate_toward(school.heading, school.target_heading, delta * 0.9)
		school.x += cos(school.heading) * school.speed * delta
		school.y += sin(school.heading) * school.speed * delta

		var lower_boundary := _swim_boundary_y(school.x) - 110.0
		if school.x < 60.0:
			school.x = 60.0
			school.target_heading = randf_range(-1.05, 1.05)
		elif school.x > VIEW_SIZE.x - 60.0:
			school.x = VIEW_SIZE.x - 60.0
			school.target_heading = PI + randf_range(-1.05, 1.05)

		if school.y < WATERLINE_Y + 72.0:
			school.y = WATERLINE_Y + 72.0
			school.target_heading = randf_range(0.2, 1.2)
		elif school.y > lower_boundary:
			school.y = lower_boundary
			school.target_heading = -randf_range(0.2, 1.2)

		schools[i] = school


func _update_fish(delta: float) -> void:
	for i in range(fish_list.size()):
		var fish := fish_list[i]
		if fish.hooked:
			continue

		fish.wiggle += delta * (1.8 + fish.depth)
		var school: Dictionary = schools[fish.school_index]
		fish.offset_x = clampf(fish.offset_x + cos(fish.wiggle * 0.8) * fish.offset_drift * delta * 12.0, -school.spread, school.spread)
		fish.offset_y = clampf(fish.offset_y + sin(fish.wiggle * 0.7) * fish.offset_drift * delta * 6.0, -36.0, 36.0)
		var target := Vector2(
			school.x + fish.offset_x + cos(fish.wiggle * 1.6) * 10.0,
			school.y + fish.offset_y + sin(fish.wiggle) * 6.0
		)
		fish.pos = fish.pos.lerp(target, delta * (1.2 + fish.depth))
		fish.dir = 1.0 if cos(school.heading) >= 0.0 else -1.0

		var dist: float = fish.pos.distance_to(lure.pos)
		if lure_state == LureState.RETRIEVING and dist < 180.0:
			fish.pos += (lure.pos - fish.pos).normalized() * fish.interest * 18.0 * delta

		var boundary_y := _swim_boundary_y(fish.pos.x)
		fish.pos.x = clampf(fish.pos.x, 22.0, VIEW_SIZE.x - 22.0)
		fish.pos.y = clampf(fish.pos.y, WATERLINE_Y + 24.0, boundary_y)
		fish.alpha = 0.2 + fish.depth * 0.16

		if lure_state == LureState.RETRIEVING:
			_try_hook_fish(i, fish, delta, dist)

		fish_list[i] = fish


func _update_shark(delta: float) -> void:
	shark.turn_timer -= delta
	if shark.turn_timer <= 0.0:
		shark.turn_timer = randf_range(1.2, 2.4)
		shark.dir = [-1.0, 1.0].pick_random()
		shark.speed = randf_range(48.0, 72.0)
		shark.pos.y += randf_range(-26.0, 26.0)

	shark.pos.x += shark.dir * shark.speed * delta
	shark.pos.y += sin(elapsed + shark.pos.x * 0.01) * 10.0 * delta
	if shark.pos.x < 70.0:
		shark.pos.x = 70.0
		shark.dir = 1.0
	elif shark.pos.x > VIEW_SIZE.x - 70.0:
		shark.pos.x = VIEW_SIZE.x - 70.0
		shark.dir = -1.0

	var shark_limit_y := _swim_boundary_y(shark.pos.x) - 26.0
	shark.pos.y = clampf(shark.pos.y, WATERLINE_Y + 42.0, shark_limit_y)


func _update_lure(delta: float) -> void:
	match lure_state:
		LureState.IDLE:
			lure.pos = player.pos + Vector2(0, -24)
		LureState.CASTING:
			lure.progress = min(1.0, lure.progress + delta * 2.6)
			var arc := sin(lure.progress * PI) * 120.0
			lure.pos = lure.start.lerp(lure.target, lure.progress) - Vector2(0, arc)
			if lure.progress >= 1.0:
				_add_splash(lure.pos, 22, Color("d7f2fb"))
				lure_state = LureState.RETRIEVING
				message_text = "Retrieve"
		LureState.RETRIEVING:
			var target: Vector2 = player.pos + Vector2(0, -24)
			var speed := (1.4 if hold_boost else 1.0) * 165.0
			var to_target: Vector2 = target - lure.pos
			if to_target.length() < 16.0:
				lure_state = LureState.IDLE
				lure.pos = target
				message_text = "Tap the water to cast"
			else:
				var movement: Vector2 = to_target.normalized() * speed * delta
				var phase := elapsed * 18.0
				var amplitude := 20.0 if hold_boost else 13.0
				var side := Vector2(-movement.y, movement.x).normalized()
				var zig := sin(phase + lure.pos.y * 0.02) * amplitude
				var pop := sin(phase * 0.5) * 3.0
				lure.pos += movement + side * zig * delta + lure.velocity * delta
				lure.pos.y -= abs(pop) * delta
				lure.velocity *= 0.8
				if int(elapsed * (20.0 if hold_boost else 12.0)) % 2 == 0:
					_add_ripple(lure.pos + Vector2(0, 8), randf_range(5.0, 9.0))
					_add_splash(lure.pos + Vector2(0, 2), 3 if not hold_boost else 4, Color("d7f2fb"))
		LureState.HOOKED:
			_update_hooked_fight(delta)
		LureState.PHOTO:
			lure.pos = player.pos + Vector2(0, -24)


func _try_hook_fish(fish_index: int, fish: Dictionary, delta: float, distance: float) -> void:
	var effective_range := 36.0
	if distance > fish.size * 1.6 + effective_range:
		return

	var strike_chance: float = (0.18 + fish.interest * 0.28 + (0.04 if hold_boost else 0.0)) * delta
	if randf() >= strike_chance:
		return

	var shark_distance: float = lure.pos.distance_to(shark.pos)
	var shark_threat: float = float(stats.shark_chance)
	if shark_distance < 120.0:
		shark_threat = 0.75
	elif shark_distance < 180.0:
		shark_threat = 0.28

	if randf() < shark_threat:
		_add_splash(lure.pos, 36, Color("ff7b5d"))
		_end_session(true)
		return

	var species: Dictionary = FISH_TABLE[fish.species_index]
	var weight := _roll_fish_weight(species)
	_begin_fight(fish_index, fish, species, weight)


func _begin_fight(fish_index: int, fish: Dictionary, species: Dictionary, weight: float) -> void:
	fish.hooked = true
	fish_list[fish_index] = fish

	var angle: float = (fish.pos - (player.pos + Vector2(0, -24))).angle()
	hooked_fight = {
		"fish_index": fish_index,
		"species": species.species,
		"color": species.color,
		"weight": weight,
		"is_photo_fish": weight > 3.0,
		"is_heavy": weight >= 5.0,
		"is_huge": weight >= 8.0,
		"score": species.score,
		"heading": angle + (1.0 if randf() > 0.5 else -1.0) * randf_range(0.4, 0.9),
		"speed": 110.0 + weight * 11.0,
		"turn_timer": 0.12,
		"run_duration": max(1.1, weight * 0.42),
		"run_elapsed": 0.0,
		"reel_duration": max(1.4, weight * 0.58),
		"reel_elapsed": 0.0,
		"run_distance_limit": min(320.0, 140.0 + weight * 10.0),
		"pulled_distance": 0.0,
		"sway": randf_range(0.0, TAU),
	}
	lure_state = LureState.HOOKED
	_add_splash(lure.pos, 24 if weight < 5.0 else 32 if weight < 8.0 else 44, species.color)
	message_text = "BIG FISH! %s %.1fkg" % [species.species, weight] if weight >= 8.0 else "%s hooked" % species.species
	_trigger_crew_glee(weight, true)
	_play_hookup_pulse(weight >= 8.0)
	_emit_hookup_burst(weight, species.color)


func _update_hooked_fight(delta: float) -> void:
	if hooked_fight.is_empty():
		lure_state = LureState.IDLE
		return

	var fight := hooked_fight
	var fish_index: int = fight.fish_index
	var fish: Dictionary = fish_list[fish_index]
	fight.sway += delta * (4.2 + fight.weight * 0.1)

	if fight.run_elapsed < fight.run_duration:
		fight.run_elapsed = min(fight.run_duration, fight.run_elapsed + delta)
		fight.turn_timer -= delta
		if fight.turn_timer <= 0.0:
			fight.turn_timer = 0.08 + randf() * 0.18
			fight.heading += randf_range(-0.8, 0.8)
			fight.speed = 100.0 + fight.weight * 10.0 + randf() * 75.0

		var step: float = fight.speed * delta
		fight.pulled_distance += step
		lure.pos.x = clampf(lure.pos.x + cos(fight.heading) * step, 26.0, VIEW_SIZE.x - 26.0)
		var shoreline_limit_y := _swim_boundary_y(lure.pos.x) - 18.0
		lure.pos.y = clampf(lure.pos.y + sin(fight.heading) * step, WATERLINE_Y + 24.0, shoreline_limit_y)
		if fight.pulled_distance > fight.run_distance_limit:
			fight.heading += PI * 0.9 + randf_range(-0.4, 0.4)
			fight.pulled_distance *= 0.62
		if lure.pos.y >= shoreline_limit_y - 4.0:
			fight.heading = -absf(fight.heading) + randf_range(-0.5, 0.5)
		if randf() < 0.58:
			_add_ripple(lure.pos + Vector2(0, 6), randf_range(8.0, 13.0))
			_add_splash(lure.pos, randi_range(10, 16), fight.color)
		message_text = "Fish running... %.1fkg" % fight.weight
	else:
		var boost := 1.18 if hold_boost else 1.0
		fight.reel_elapsed = min(fight.reel_duration, fight.reel_elapsed + delta * boost)
		var t := _ease_in_out_quad(fight.reel_elapsed / fight.reel_duration)
		var sway: float = max(12.0, 28.0 - fight.weight * 0.28)
		lure.pos = lure.pos.lerp(player.pos + Vector2(0, -24), delta * (0.42 + boost * 0.22))
		lure.pos += Vector2(sin(fight.sway) * sway * (1.0 - t), cos(fight.sway * 0.7) * sway * 0.55 * (1.0 - t))
		var reel_boundary_y := _swim_boundary_y(lure.pos.x) - 18.0
		lure.pos.x = clampf(lure.pos.x, 26.0, VIEW_SIZE.x - 26.0)
		lure.pos.y = clampf(lure.pos.y, WATERLINE_Y + 24.0, reel_boundary_y)
		if randf() < 0.24:
			_add_ripple(lure.pos + Vector2(0, 6), randf_range(5.0, 9.0))
			_add_splash(lure.pos, randi_range(5, 9), fight.color)
		message_text = "Reeling hard... %s" % fight.species if hold_boost else "Reeling in %s" % fight.species
		if fight.reel_elapsed >= fight.reel_duration:
			hooked_fight = fight
			_land_fight()
			return

	_update_fight_hype(delta, fight)
	fish.pos = lure.pos
	fish_list[fish_index] = fish
	hooked_fight = fight


func _update_fight_hype(delta: float, fight: Dictionary) -> void:
	if not fight.is_heavy:
		return

	hype_timer -= delta
	if hype_timer > 0.0:
		return

	var shouts := ["YES!", "GOOD FISH!", "KEEP WINDING!", "NICE!", "HAHA!"]
	if fight.is_huge:
		shouts = ["WIL GLEE!", "GET IN!", "BIG ONE!", "YEEEW!", "DON'T DROP IT!"]
	fight_hype_text = shouts.pick_random()
	_trigger_crew_glee(fight.weight, false, fight_hype_text)
	hype_timer = 0.7 if fight.is_huge else 1.0


func _land_fight() -> void:
	var fight := hooked_fight
	if fight.is_empty():
		return

	stats.catches += 1
	stats.total_weight += fight.weight
	stats.shark_chance = min(0.42, stats.shark_chance + 0.012 + fight.score * 0.003)
	if fight.weight > stats.best_weight:
		stats.best_weight = fight.weight
		stats.best_fish = "%s %.1fkg" % [fight.species, fight.weight]

	catch_species = fight.species
	catch_weight = fight.weight
	_trigger_crew_glee(fight.weight, false, "WIL GLEE!")

	if fight.is_photo_fish:
		_start_photo_moment(fight)
	else:
		_release_fish(fight)


func _start_photo_moment(fight: Dictionary) -> void:
	lure_state = LureState.PHOTO
	photo_moment = {
		"active": true,
		"fight": fight,
		"timer": 0.0,
		"flashes": [],
	}
	message_text = "Crew in! %s" % fight.species

	for i in range(side_anglers.size()):
		var angler := side_anglers[i]
		angler.state = "photo"
		angler.pos = Vector2(player.pos.x - 82.0, _swim_boundary_y(player.pos.x - 82.0) + 22.0) if i == 0 else Vector2(player.pos.x + 86.0, _swim_boundary_y(player.pos.x + 86.0) + 22.0)
		angler.cheer = "LOOK AT IT!" if i == 0 else "YEAH!"
		angler.cheer_timer = 1.1
		side_anglers[i] = angler


func _release_fish(fight: Dictionary) -> void:
	var fish_index: int = fight.fish_index
	var fish: Dictionary = fish_list[fish_index]
	var release_x := clampf(player.pos.x + randf_range(-140.0, 140.0), 60.0, VIEW_SIZE.x - 60.0)
	var release_y := clampf(SHORE_Y - 250.0 + randf_range(-30.0, 30.0), WATERLINE_Y + 70.0, _swim_boundary_y(release_x) - 28.0)
	_add_splash(Vector2(release_x, release_y), int(16 + fight.weight * 4.5), fight.color)
	_add_ripple(Vector2(release_x, release_y + 10.0), 10.0 + fight.weight * 1.8)

	var school_index := randi_range(0, schools.size() - 1)
	var school: Dictionary = schools[school_index]
	fish.species_index = _pick_weighted_index(SPECIES_WEIGHTS)
	fish.school_index = school_index
	fish.offset_x = randf_range(-school.spread, school.spread)
	fish.offset_y = randf_range(-24.0, 24.0)
	fish.offset_drift = randf_range(-0.8, 0.8)
	fish.hooked = false
	fish.pos = Vector2(school.x + fish.offset_x, clampf(school.y + fish.offset_y, WATERLINE_Y + 24.0, _swim_boundary_y(school.x + fish.offset_x)))
	fish_list[fish_index] = fish

	if not photo_moment.has("active"):
		lure_state = LureState.IDLE
		message_text = "Released %s" % fight.species
		hooked_fight.clear()
		return

	photo_moment.fight = fight


func _update_photo(delta: float) -> void:
	if not photo_moment.has("active"):
		return
	photo_moment.timer += delta
	if photo_moment.timer > 0.42 and photo_moment.flashes.is_empty():
		photo_moment.flashes = [0.18, 0.36]
		message_text = "Snap it! %s" % photo_moment.fight.species
		_trigger_photo_flash()
		for i in range(side_anglers.size()):
			var angler := side_anglers[i]
			angler.cheer = "PHOTO!" if i == 0 else "SHOT!"
			angler.cheer_timer = 0.8
			side_anglers[i] = angler
	if photo_moment.timer > 0.98:
		var fight: Dictionary = photo_moment.fight
		photo_moment.clear()
		_release_fish(fight)
		_reset_side_anglers()
		lure_state = LureState.IDLE
		hooked_fight.clear()
		message_text = "Back to fishing"


func _add_ripple(pos: Vector2, radius: float) -> void:
	splashes.append({
		"type": "ripple",
		"pos": pos,
		"radius": radius,
		"life": 0.8,
	})


func _add_splash(pos: Vector2, count: int, color: Color) -> void:
	for i in range(count):
		splashes.append({
			"type": "drop",
			"pos": pos,
			"vx": cos(-PI / 2.0 + randf_range(-0.9, 0.9)) * randf_range(30.0, 130.0),
			"vy": sin(-PI / 2.0 + randf_range(-0.9, 0.9)) * randf_range(30.0, 130.0),
			"radius": randf_range(2.0, 5.0),
			"life": randf_range(0.35, 0.8),
			"color": color if randf() > 0.65 else Color("d7f2fb"),
		})


func _update_splashes(delta: float) -> void:
	if photo_moment.has("active"):
		_update_photo(delta)

	var remaining: Array[Dictionary] = []
	for splash in splashes:
		splash.life -= delta
		if splash.life <= 0.0:
			continue
		if splash.type == "drop":
			splash.pos += Vector2(splash.vx, splash.vy) * delta
			splash.vx *= 0.97
			splash.vy *= 0.97
		else:
			splash.radius += 42.0 * delta
		remaining.append(splash)
	splashes = remaining


func _cast_lure(target: Vector2) -> void:
	lure_state = LureState.CASTING
	lure.start = player.pos + Vector2(0, -24)
	lure.target = Vector2(clampf(target.x, 60.0, VIEW_SIZE.x - 60.0), clampf(target.y, WATERLINE_Y + 30.0, SHORE_Y - 120.0))
	lure.progress = 0.0
	lure.velocity = Vector2.ZERO
	message_text = "Casting..."


func _trigger_crew_glee(weight: float, first_hook: bool, custom_text: String = "") -> void:
	var main_shout := custom_text if custom_text != "" else ("WIL GLEE!" if weight >= 8.0 else "YEW!")
	player.yell = main_shout
	player.yell_timer = 1.0 if first_hook else 0.7

	for i in range(side_anglers.size()):
		var angler := side_anglers[i]
		angler.cheer = custom_text if custom_text != "" else ("WOOO!" if weight >= 8.0 else "YEAH!")
		angler.cheer_timer = 0.9 + i * 0.1
		side_anglers[i] = angler


func _draw_sky() -> void:
	draw_rect(Rect2(Vector2.ZERO, Vector2(VIEW_SIZE.x, 130)), Color("c8e6ed"))
	draw_rect(Rect2(Vector2(0, 130), Vector2(VIEW_SIZE.x, 110)), Color("b2d8e3"))
	draw_rect(Rect2(Vector2(0, 240), Vector2(VIEW_SIZE.x, 100)), Color("95c7d9"))

	var far_land := PackedVector2Array([
		Vector2(0, WATERLINE_Y - 18),
		Vector2(90, WATERLINE_Y - 62),
		Vector2(180, WATERLINE_Y - 24),
		Vector2(290, WATERLINE_Y - 76),
		Vector2(430, WATERLINE_Y - 18),
		Vector2(560, WATERLINE_Y - 82),
		Vector2(690, WATERLINE_Y - 28),
		Vector2(820, WATERLINE_Y - 66),
		Vector2(VIEW_SIZE.x, WATERLINE_Y - 24),
		Vector2(VIEW_SIZE.x, WATERLINE_Y + 10),
		Vector2(0, WATERLINE_Y + 10),
	])
	draw_colored_polygon(far_land, Color(0.37, 0.52, 0.58, 0.42))
	var nearer_land := PackedVector2Array([
		Vector2(0, WATERLINE_Y + 8),
		Vector2(120, WATERLINE_Y - 10),
		Vector2(240, WATERLINE_Y + 4),
		Vector2(360, WATERLINE_Y - 22),
		Vector2(510, WATERLINE_Y + 10),
		Vector2(650, WATERLINE_Y - 18),
		Vector2(790, WATERLINE_Y + 6),
		Vector2(VIEW_SIZE.x, WATERLINE_Y - 8),
		Vector2(VIEW_SIZE.x, WATERLINE_Y + 30),
		Vector2(0, WATERLINE_Y + 30),
	])
	draw_colored_polygon(nearer_land, Color(0.26, 0.40, 0.48, 0.36))

	var sun := Vector2(VIEW_SIZE.x * 0.82, 118)
	draw_circle(sun, 58, Color(1.0, 0.96, 0.78, 0.18))
	draw_circle(sun, 34, Color(1.0, 0.97, 0.84, 0.24))

	for i in range(7):
		var cloud_pos := Vector2(70 + i * 126 + sin(elapsed * 0.08 + i * 0.7) * 18.0, 62 + (i % 3) * 34)
		draw_circle(cloud_pos, 30, Color(1, 1, 1, 0.11))
		draw_circle(cloud_pos + Vector2(26, -8), 24, Color(1, 1, 1, 0.09))
		draw_circle(cloud_pos + Vector2(-20, 4), 22, Color(1, 1, 1, 0.07))

	for i in range(5):
		var haze_y := 108 + i * 30
		draw_rect(Rect2(0, haze_y, VIEW_SIZE.x, 2), Color(1, 1, 1, 0.04))

	for beam in range(5):
		var beam_x := 90.0 + beam * 170.0 + sin(elapsed * 0.2 + beam) * 14.0
		var beam_poly := PackedVector2Array([
			Vector2(beam_x - 30, 0),
			Vector2(beam_x + 26, 0),
			Vector2(beam_x + 84, WATERLINE_Y + 70),
			Vector2(beam_x + 10, WATERLINE_Y + 70),
		])
		draw_colored_polygon(beam_poly, Color(1, 0.98, 0.84, 0.035))


func _draw_ocean() -> void:
	draw_rect(Rect2(Vector2(0, WATERLINE_Y), Vector2(VIEW_SIZE.x, SHORE_Y - WATERLINE_Y)), Color("3e9bb0"))
	draw_rect(Rect2(Vector2(0, WATERLINE_Y + 80), Vector2(VIEW_SIZE.x, SHORE_Y - WATERLINE_Y - 80)), Color("2b7f99"))
	draw_rect(Rect2(Vector2(0, WATERLINE_Y + 260), Vector2(VIEW_SIZE.x, SHORE_Y - WATERLINE_Y - 260)), Color("1f6383"))
	draw_rect(Rect2(Vector2(0, WATERLINE_Y + 520), Vector2(VIEW_SIZE.x, SHORE_Y - WATERLINE_Y - 520)), Color("164d6f"))

	for shaft in range(7):
		var x := 40.0 + shaft * 140.0 + sin(elapsed * 0.33 + shaft) * 22.0
		draw_rect(Rect2(x, WATERLINE_Y + 20, 24, SHORE_Y - WATERLINE_Y - 140), Color(0.84, 0.98, 1.0, 0.025))

	for band in range(9):
		var y := WATERLINE_Y + 62.0 + band * 96.0
		var points := PackedVector2Array()
		for x in range(-40, int(VIEW_SIZE.x) + 60, 18):
			var drift := elapsed * current_strength * current_direction
			var wave := sin((x * 0.018) + band * 0.7 + elapsed * 1.6 + wave_seed) * 7.0
			points.append(Vector2(x + drift * 0.05, y + wave))
		draw_polyline(points, Color(0.86, 0.97, 0.99, 0.17), 2.0)
		draw_polyline(points, Color(0.54, 0.84, 0.91, 0.06), 6.0)

	for lane in range(24):
		var base_x := fposmod(elapsed * current_strength * current_direction + lane * 58.0, VIEW_SIZE.x + 120.0)
		var x := base_x - 60.0
		if current_direction < 0.0:
			x = VIEW_SIZE.x - base_x + 60.0
		var y := WATERLINE_Y + 90.0 + (lane % 6) * 120.0 + sin(elapsed * 1.4 + lane) * 10.0
		var tri := PackedVector2Array([
			Vector2(x, y),
			Vector2(x - 12.0 * current_direction, y - 4.0),
			Vector2(x - 12.0 * current_direction, y + 4.0),
		])
		draw_colored_polygon(tri, Color(0.87, 0.97, 0.99, 0.10))

	var foam_points := PackedVector2Array()
	for x in range(-30, int(VIEW_SIZE.x) + 40, 14):
		var wave := sin((x * 0.024) + elapsed * 2.1 + wave_seed) * 8.0
		foam_points.append(Vector2(x, WATERLINE_Y + 16.0 + wave))
	draw_polyline(foam_points, Color(0.92, 0.99, 1.0, 0.44), 3.0)
	draw_polyline(foam_points, Color(1, 1, 1, 0.08), 8.0)

	for i in range(6):
		var caustic_y := WATERLINE_Y + 180 + i * 120
		var drift_x := fposmod(elapsed * 22.0 * current_direction + i * 80.0, VIEW_SIZE.x + 180.0) - 90.0
		for j in range(4):
			var pos := Vector2(drift_x + j * 180.0, caustic_y + sin(elapsed * 1.6 + i + j) * 10.0)
			draw_rect(Rect2(pos, Vector2(34, 3)), Color(0.82, 0.98, 1.0, 0.06))
			draw_rect(Rect2(pos + Vector2(12, 7), Vector2(24, 2)), Color(0.82, 0.98, 1.0, 0.04))

	for glint in range(12):
		var gx := fposmod(elapsed * 14.0 * current_direction + glint * 78.0, VIEW_SIZE.x + 140.0) - 70.0
		var gy := WATERLINE_Y + 46.0 + (glint % 4) * 18.0 + sin(elapsed * 1.2 + glint) * 2.0
		draw_rect(Rect2(gx, gy, 18, 2), Color(1, 1, 1, 0.11))


func _draw_shoreline() -> void:
	var fill_points := PackedVector2Array(shoreline_profile)
	fill_points.append(Vector2(VIEW_SIZE.x, VIEW_SIZE.y))
	fill_points.append(Vector2(0, VIEW_SIZE.y))
	draw_colored_polygon(fill_points, Color("505b62"))
	draw_rect(Rect2(Vector2(0, SHORE_Y + 8.0), Vector2(VIEW_SIZE.x, VIEW_SIZE.y - SHORE_Y)), Color("364047"))
	draw_rect(Rect2(Vector2(0, SHORE_Y + 8.0), Vector2(VIEW_SIZE.x, 14.0)), Color(0, 0, 0, 0.16))

	for i in range(shoreline_profile.size() - 1):
		var a := shoreline_profile[i]
		var b := shoreline_profile[i + 1]
		var mid := a.lerp(b, 0.45)
		draw_rect(Rect2(mid + Vector2(-26, -8), Vector2(30, 6)), Color("748187"))
		var face := PackedVector2Array([
			a,
			b,
			b + Vector2(0, 24),
			a + Vector2(0, 30),
		])
		draw_colored_polygon(face, Color(0.31, 0.35, 0.38, 0.24))
		draw_rect(Rect2(mid + Vector2(-12, -16), Vector2(56, 5)), Color(0.86, 0.92, 0.95, 0.06))

	var lip_points := PackedVector2Array()
	for point in shoreline_profile:
		lip_points.append(point + Vector2(0, -4))
	draw_polyline(lip_points, Color(0.86, 0.96, 0.99, 0.45), 3.0)
	draw_polyline(lip_points, Color(1, 1, 1, 0.08), 8.0)

	for i in range(shoreline_profile.size() - 1):
		var left := shoreline_profile[i]
		var right := shoreline_profile[i + 1]
		var foam_mid := left.lerp(right, 0.5) + Vector2(0, -10 + sin(elapsed * 1.8 + i) * 3.0)
		draw_rect(Rect2(foam_mid + Vector2(-18, -1), Vector2(24, 2)), Color(0.9, 0.98, 1.0, 0.18))


func _draw_fish() -> void:
	if fish_atlas == null:
		return
	for fish in fish_list:
		if fish.hooked:
			continue
		var species_index: int = fish.species_index
		var src := Rect2(Vector2(species_index * FISH_FRAME_SIZE.x, 0), FISH_FRAME_SIZE)
		var size: Vector2 = FISH_FRAME_SIZE * (1.55 + fish.scale * 0.28)
		var rect := Rect2(fish.pos - size * 0.5, size)
		var shadow_rect := rect
		shadow_rect.position += Vector2(0, 12 + fish.depth * 6.0)
		if fish.dir < 0.0:
			rect.position.x += rect.size.x
			rect.size.x *= -1.0
			shadow_rect.position.x += shadow_rect.size.x
			shadow_rect.size.x *= -1.0
		var tint := Color(0.56 + fish.depth * 0.18, 0.68 + fish.depth * 0.12, 0.75 + fish.depth * 0.10, fish.alpha)
		draw_texture_rect_region(fish_atlas, shadow_rect, src, Color(0.05, 0.12, 0.18, fish.alpha * 0.18))
		draw_texture_rect_region(fish_atlas, rect, src, tint)


func _draw_shark() -> void:
	if shark_atlas == null or shark_fin_atlas == null:
		return
	var body_size := Vector2(210, 70)
	var body_rect := Rect2(shark.pos - body_size * Vector2(0.48, 0.56), body_size)
	var shadow_rect := Rect2(body_rect.position + Vector2(0, 18), body_rect.size)
	if shark.dir < 0.0:
		body_rect.position.x += body_rect.size.x
		body_rect.size.x *= -1.0
		shadow_rect.position.x += shadow_rect.size.x
		shadow_rect.size.x *= -1.0
	draw_texture_rect_region(shark_atlas, shadow_rect, Rect2(Vector2.ZERO, Vector2(96, 32)), Color(0.04, 0.09, 0.12, 0.12))
	draw_texture_rect_region(shark_atlas, body_rect, Rect2(Vector2.ZERO, Vector2(96, 32)), Color(0.86, 0.96, 1.0, 0.42))
	var fin_center: Vector2 = shark.pos + Vector2(shark.dir * 4.0, -74.0)
	var fin_rect := Rect2(fin_center - Vector2(70, 34), Vector2(140, 48))
	if shark.dir < 0.0:
		fin_rect.position.x += fin_rect.size.x
		fin_rect.size.x *= -1.0
	draw_texture_rect_region(shark_fin_atlas, fin_rect, Rect2(Vector2.ZERO, Vector2(96, 32)), Color(0.85, 0.95, 1.0, 0.95))
	draw_polyline(PackedVector2Array([
		fin_center + Vector2(-28 * shark.dir, 10),
		fin_center + Vector2(-6 * shark.dir, 6),
		fin_center + Vector2(16 * shark.dir, 10),
	]), Color(0.83, 0.93, 0.96, 0.42), 2.0)
	draw_polyline(PackedVector2Array([
		fin_center + Vector2(-42 * shark.dir, 13),
		fin_center + Vector2(-16 * shark.dir, 9),
		fin_center + Vector2(22 * shark.dir, 13),
	]), Color(1, 1, 1, 0.08), 5.0)


func _draw_anglers() -> void:
	for i in range(side_anglers.size()):
		var angler := side_anglers[i]
		_draw_angler_sprite(angler.pos, i + 1, angler.flip)
		if angler.cheer_timer > 0.0:
			_draw_bubble(angler.pos + Vector2(0, -90), angler.cheer)
		if angler.state != "waiting" and angler.state != "photo":
			draw_line(angler.cast_origin, angler.lure, Color("f7edd1"), 1.0)
			draw_rect(Rect2(angler.lure - Vector2.ONE * 2.0, Vector2.ONE * 4.0), Color("ffef8d", 0.9))

	_draw_angler_sprite(player.pos, 0, player.flip)
	if photo_moment.has("active") and hooked_fight.has("species"):
		_draw_photo_fish()
	if player.yell_timer > 0.0:
		_draw_bubble(player.pos + Vector2(0, -96), player.yell)


func _draw_angler_sprite(pos: Vector2, frame_index: int, flip: bool) -> void:
	if angler_atlas == null:
		return
	var src := Rect2(Vector2(frame_index * ANGLER_FRAME_SIZE.x, 0), ANGLER_FRAME_SIZE)
	var size := ANGLER_FRAME_SIZE * 3.2
	var rect := Rect2(pos - Vector2(size.x * 0.5, size.y * 0.92), size)
	var shadow := Rect2(rect.position + Vector2(18, 18), rect.size)
	if flip:
		rect.position.x += rect.size.x
		rect.size.x *= -1.0
		shadow.position.x += shadow.size.x
		shadow.size.x *= -1.0
	draw_texture_rect_region(angler_atlas, shadow, src, Color(0, 0, 0, 0.16))
	draw_texture_rect_region(angler_atlas, rect, src)
	var rod_origin := pos + Vector2(28.0 if not flip else -28.0, -62.0)
	var rod_tip := pos + Vector2(126.0 if not flip else -126.0, -126.0)
	draw_line(rod_origin, rod_tip, Color("6a4b2e"), 4.0)
	draw_line(rod_origin + Vector2(6.0 if not flip else -6.0, 4.0), rod_tip + Vector2(0, -4), Color("f6efd9", 0.55), 1.0)


func _draw_lure_and_line() -> void:
	if mode == GameMode.TITLE:
		return
	draw_line(player.pos + Vector2(24, -66), lure.pos, Color("fff6d6"), 2.0)
	draw_rect(Rect2(lure.pos - Vector2(6, 6), Vector2(12, 12)), Color("fff783"))
	draw_rect(Rect2(lure.pos + Vector2(2, -2), Vector2(4, 4)), Color("ef8b5f"))


func _draw_splashes() -> void:
	for splash in splashes:
		if splash.type == "drop":
			var col: Color = splash.color
			col.a = splash.life
			var frame := int(clampf((1.0 - splash.life / 0.8) * 4.0, 0.0, 3.0))
			var src := Rect2(Vector2(frame * SPLASH_FRAME_SIZE.x, 0), SPLASH_FRAME_SIZE)
			var size: Vector2 = Vector2(20.0, 36.0) * max(0.7, splash.radius / 3.5)
			var rect := Rect2(splash.pos - size * 0.5, size)
			if splash_atlas != null:
				draw_texture_rect_region(splash_atlas, rect, src, col)
		else:
			var col: Color = Color("dcf5ff")
			col.a = splash.life * 0.55
			draw_arc(splash.pos, splash.radius, 0.0, TAU, 24, col, 2.0)


func _draw_bubble(pos: Vector2, text: String) -> void:
	var font := ThemeDB.fallback_font
	var size := font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, 14)
	var rect := Rect2(pos.x - size.x * 0.5 - 10.0, pos.y - 18.0, size.x + 20.0, 26.0)
	draw_rect(rect, Color(0.12, 0.20, 0.28, 0.92), true)
	draw_rect(rect, Color(1, 1, 1, 0.12), false, 2.0)
	draw_string(font, Vector2(rect.position.x + 10.0, rect.position.y + 18.0), text, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color("fff0be"))


func _draw_photo_fish() -> void:
	if fish_atlas == null:
		return
	var species_name: String = String(hooked_fight.species)
	var species_index := 0
	for i in range(FISH_TABLE.size()):
		if String(FISH_TABLE[i].species) == species_name:
			species_index = i
			break
	var src := Rect2(Vector2(species_index * FISH_FRAME_SIZE.x, 0), FISH_FRAME_SIZE)
	var pos: Vector2 = player.pos + Vector2(0, -118)
	var size: Vector2 = FISH_FRAME_SIZE * 2.8
	var rect := Rect2(pos - size * 0.5, size)
	draw_texture_rect_region(fish_atlas, rect, src, Color(0.95, 0.98, 1.0, 0.96))
	draw_rect(Rect2(pos + Vector2(-42, 24), Vector2(84, 10)), Color(0, 0, 0, 0.12))


func _draw_vignette() -> void:
	draw_rect(Rect2(0, 0, VIEW_SIZE.x, 54), Color(0.02, 0.05, 0.07, 0.14))
	draw_rect(Rect2(0, VIEW_SIZE.y - 90, VIEW_SIZE.x, 90), Color(0.02, 0.05, 0.07, 0.12))
	draw_rect(Rect2(0, 0, 36, VIEW_SIZE.y), Color(0.02, 0.05, 0.07, 0.10))
	draw_rect(Rect2(VIEW_SIZE.x - 36, 0, 36, VIEW_SIZE.y), Color(0.02, 0.05, 0.07, 0.10))


func _load_runtime_textures() -> void:
	angler_atlas = _load_runtime_texture("res://assets/anglers_sheet.png")
	fish_atlas = _load_runtime_texture("res://assets/fish_sheet.png")
	shark_atlas = _load_runtime_texture("res://assets/shark_sheet.png")
	shark_fin_atlas = _load_runtime_texture("res://assets/shark_fin.png")
	splash_atlas = _load_runtime_texture("res://assets/splash_sheet.png")
	water_texture = _load_runtime_texture("res://assets/water_base.png")


func _load_runtime_texture(path: String) -> Texture2D:
	var image := Image.new()
	var error := image.load(ProjectSettings.globalize_path(path))
	if error != OK:
		push_warning("Could not load texture: %s" % path)
		return null
	return ImageTexture.create_from_image(image)


func _sync_ui() -> void:
	if presented_mode != mode:
		_handle_mode_presentation()
		presented_mode = mode

	title_screen.visible = mode == GameMode.TITLE
	hud.visible = mode != GameMode.TITLE
	end_screen.visible = mode == GameMode.END_SCREEN

	timer_label.text = _format_time(session_time_left)
	tide_bar_fill.size.x = 126.0 * clampf(session_time_left / SESSION_SECONDS, 0.0, 1.0)
	var tide_ratio := clampf(session_time_left / SESSION_SECONDS, 0.0, 1.0)
	tide_bar_fill.color = Color("9ed6e4").lerp(Color("ff8766"), 1.0 - tide_ratio)
	catch_label.text = "%s  %.1f kg" % [catch_species, catch_weight]
	var best_text: String = String(stats.best_fish) if String(stats.best_fish) != "" else "None"
	stats_label.text = "Caught %d   Best %s   Total %.1f kg" % [stats.catches, best_text, stats.total_weight]
	message_label.text = message_text
	timer_label.add_theme_color_override("font_color", Color("fff0be").lerp(Color("ffb08e"), 1.0 - tide_ratio))
	message_panel.modulate = Color(1, 1, 1, 0.92 + (1.0 - tide_ratio) * 0.08)
	end_panel.modulate = Color(1, 0.92, 0.92, 1.0) if message_text.contains("Shark hooked") else Color(1, 1, 1, 1)

	end_title.text = "NOT SO BORING NOW\nLINE SNAP!" if message_text.contains("Shark hooked") else "TIDE FINISHED"
	end_stats.text = "Catch %d\nBest %s\nTotal %.1f kg" % [stats.catches, best_text, stats.total_weight]


func _update_water_shader() -> void:
	camera_2d.position = Vector2(450 + sin(elapsed * 0.17) * 6.0, 700 + cos(elapsed * 0.13) * 4.0)
	if water_fx.material is ShaderMaterial:
		var material := water_fx.material as ShaderMaterial
		material.set_shader_parameter("current_strength", 0.02 + current_strength / 1800.0)
		material.set_shader_parameter("ripple_strength", 0.014 + absf(sin(elapsed * 0.7)) * 0.01)


func _play_title_intro() -> void:
	if not is_node_ready():
		return
	title_panel.position = Vector2(110, 210)
	title_panel.modulate.a = 0.0
	start_button.scale = Vector2.ONE
	scene_animations.play("title_intro")
	scene_animations.queue("button_breathe")


func _play_hookup_pulse(is_huge: bool) -> void:
	if not is_node_ready():
		return
	message_panel.pivot_offset = message_panel.size * 0.5
	message_panel.scale = Vector2(1.1, 1.1) if is_huge else Vector2(1.04, 1.04)
	scene_animations.play("message_pulse")


func _trigger_photo_flash() -> void:
	if not is_node_ready():
		return
	photo_flash.visible = true
	photo_flash.modulate = Color(1, 1, 1, 0.0)
	scene_animations.play("photo_flash")


func _configure_particles() -> void:
	var mist_material := ParticleProcessMaterial.new()
	mist_material.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	mist_material.emission_box_extents = Vector3(460, 20, 0)
	mist_material.direction = Vector3(0, -1, 0)
	mist_material.spread = 12.0
	mist_material.gravity = Vector3(18, -10, 0)
	mist_material.initial_velocity_min = 8.0
	mist_material.initial_velocity_max = 22.0
	mist_material.scale_min = 0.8
	mist_material.scale_max = 1.6
	mist_material.color = Color(0.88, 0.97, 0.99, 0.18)
	sea_mist.amount = 36
	sea_mist.lifetime = 2.4
	sea_mist.preprocess = 2.0
	sea_mist.process_material = mist_material
	sea_mist.emitting = true

	var sparkle_material := ParticleProcessMaterial.new()
	sparkle_material.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	sparkle_material.emission_box_extents = Vector3(440, 180, 0)
	sparkle_material.direction = Vector3(1, 0, 0)
	sparkle_material.spread = 8.0
	sparkle_material.gravity = Vector3(6, 0, 0)
	sparkle_material.initial_velocity_min = 4.0
	sparkle_material.initial_velocity_max = 12.0
	sparkle_material.scale_min = 0.4
	sparkle_material.scale_max = 1.0
	sparkle_material.color = Color(0.95, 0.99, 1.0, 0.14)
	surface_sparkles.amount = 26
	surface_sparkles.lifetime = 1.6
	surface_sparkles.preprocess = 1.6
	surface_sparkles.process_material = sparkle_material
	surface_sparkles.emitting = true

	var burst_material := ParticleProcessMaterial.new()
	burst_material.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_POINT
	burst_material.direction = Vector3(0, -1, 0)
	burst_material.spread = 90.0
	burst_material.gravity = Vector3(0, 90, 0)
	burst_material.initial_velocity_min = 60.0
	burst_material.initial_velocity_max = 160.0
	burst_material.scale_min = 0.9
	burst_material.scale_max = 1.8
	burst_material.color = Color("d7f2fb")
	hookup_burst.one_shot = true
	hookup_burst.amount = 24
	hookup_burst.lifetime = 0.75
	hookup_burst.process_material = burst_material
	hookup_burst.emitting = false


func _update_ambient_fx(_delta: float) -> void:
	sea_mist.position = Vector2(VIEW_SIZE.x * 0.5 + sin(elapsed * 0.22) * 24.0, SHORE_Y - 88.0)
	surface_sparkles.position = Vector2(VIEW_SIZE.x * 0.5 + sin(elapsed * 0.14) * 16.0, WATERLINE_Y + 110.0)
	if sea_mist.process_material is ParticleProcessMaterial:
		var mist_material := sea_mist.process_material as ParticleProcessMaterial
		mist_material.gravity = Vector3(14 * current_direction, -10, 0)
	if surface_sparkles.process_material is ParticleProcessMaterial:
		var sparkle_material := surface_sparkles.process_material as ParticleProcessMaterial
		sparkle_material.gravity = Vector3(10 * current_direction, 0, 0)


func _emit_hookup_burst(weight: float, splash_color: Color) -> void:
	hookup_burst.position = lure.pos
	hookup_burst.amount = 22 if weight < 5.0 else 34 if weight < 8.0 else 48
	if hookup_burst.process_material is ParticleProcessMaterial:
		var burst_material := hookup_burst.process_material as ParticleProcessMaterial
		burst_material.color = splash_color.lightened(0.22)
		burst_material.initial_velocity_min = 70.0 + weight * 4.0
		burst_material.initial_velocity_max = 140.0 + weight * 7.0
	hookup_burst.restart()
	hookup_burst.emitting = true


func _apply_ui_skin() -> void:
	var panel_style := StyleBoxFlat.new()
	panel_style.bg_color = Color(0.07, 0.13, 0.18, 0.84)
	panel_style.border_color = Color(0.72, 0.85, 0.88, 0.18)
	panel_style.border_width_left = 3
	panel_style.border_width_top = 3
	panel_style.border_width_right = 3
	panel_style.border_width_bottom = 3
	panel_style.corner_radius_top_left = 14
	panel_style.corner_radius_top_right = 14
	panel_style.corner_radius_bottom_left = 14
	panel_style.corner_radius_bottom_right = 14

	var panel_soft := panel_style.duplicate() as StyleBoxFlat
	panel_soft.bg_color = Color(0.09, 0.18, 0.22, 0.70)

	var button_style := StyleBoxFlat.new()
	button_style.bg_color = Color("f0e2ab")
	button_style.border_color = Color("fff8d8")
	button_style.border_width_left = 3
	button_style.border_width_top = 3
	button_style.border_width_right = 3
	button_style.border_width_bottom = 3
	button_style.corner_radius_top_left = 10
	button_style.corner_radius_top_right = 10
	button_style.corner_radius_bottom_left = 10
	button_style.corner_radius_bottom_right = 10

	var button_hover := button_style.duplicate() as StyleBoxFlat
	button_hover.bg_color = Color("fff0c8")

	tide_panel.add_theme_stylebox_override("panel", panel_soft)
	message_panel.add_theme_stylebox_override("panel", panel_style)
	title_panel.add_theme_stylebox_override("panel", panel_style)
	instructions_panel.add_theme_stylebox_override("panel", panel_soft)
	end_panel.add_theme_stylebox_override("panel", panel_style)
	start_button.add_theme_stylebox_override("normal", button_style)
	start_button.add_theme_stylebox_override("hover", button_hover)
	start_button.add_theme_stylebox_override("pressed", button_hover)
	start_button.add_theme_color_override("font_color", Color("20384a"))
	start_button.add_theme_color_override("font_hover_color", Color("20384a"))
	start_button.add_theme_color_override("font_pressed_color", Color("20384a"))
	timer_label.add_theme_color_override("font_color", Color("fff0be"))
	catch_label.add_theme_color_override("font_color", Color("f3f0db"))
	stats_label.add_theme_color_override("font_color", Color(0.86, 0.91, 0.88, 0.88))
	message_label.add_theme_color_override("font_color", Color("fff0be"))
	title_label.add_theme_color_override("font_color", Color("fff0be"))
	tagline_label.add_theme_color_override("font_color", Color(0.92, 0.96, 0.93, 0.88))
	end_title.add_theme_color_override("font_color", Color("fff0be"))
	end_stats.add_theme_color_override("font_color", Color(0.94, 0.96, 0.92))
	photo_flash.mouse_filter = Control.MOUSE_FILTER_IGNORE


func _build_scene_animations() -> void:
	var library := AnimationLibrary.new()

	var title_intro := Animation.new()
	title_intro.length = 0.6
	title_intro.add_track(Animation.TYPE_VALUE)
	title_intro.track_set_path(0, NodePath("TitleScreen/TitlePanel:position"))
	title_intro.track_insert_key(0, 0.0, Vector2(110, 210))
	title_intro.track_insert_key(0, 0.6, Vector2(110, 150))
	title_intro.add_track(Animation.TYPE_VALUE)
	title_intro.track_set_path(1, NodePath("TitleScreen/TitlePanel:modulate"))
	title_intro.track_insert_key(1, 0.0, Color(1, 1, 1, 0))
	title_intro.track_insert_key(1, 0.45, Color(1, 1, 1, 1))
	library.add_animation("title_intro", title_intro)

	var button_breathe := Animation.new()
	button_breathe.length = 1.8
	button_breathe.loop_mode = Animation.LOOP_LINEAR
	button_breathe.add_track(Animation.TYPE_VALUE)
	button_breathe.track_set_path(0, NodePath("TitleScreen/TitlePanel/StartButton:scale"))
	button_breathe.track_insert_key(0, 0.0, Vector2.ONE)
	button_breathe.track_insert_key(0, 0.9, Vector2(1.03, 1.03))
	button_breathe.track_insert_key(0, 1.8, Vector2.ONE)
	library.add_animation("button_breathe", button_breathe)

	var message_pulse := Animation.new()
	message_pulse.length = 0.28
	message_pulse.add_track(Animation.TYPE_VALUE)
	message_pulse.track_set_path(0, NodePath("HUD/MessagePanel:scale"))
	message_pulse.track_insert_key(0, 0.0, message_panel.scale)
	message_pulse.track_insert_key(0, 0.28, Vector2.ONE)
	library.add_animation("message_pulse", message_pulse)

	var photo := Animation.new()
	photo.length = 0.28
	photo.add_track(Animation.TYPE_VALUE)
	photo.track_set_path(0, NodePath("PhotoFlash:modulate"))
	photo.track_insert_key(0, 0.0, Color(1, 1, 1, 0))
	photo.track_insert_key(0, 0.06, Color(1, 1, 1, 0.92))
	photo.track_insert_key(0, 0.28, Color(1, 1, 1, 0))
	library.add_animation("photo_flash", photo)

	scene_animations.add_animation_library("", library)
	scene_animations.animation_finished.connect(_on_scene_animation_finished)


func _on_scene_animation_finished(name: StringName) -> void:
	if name == "photo_flash":
		photo_flash.visible = false


func _handle_mode_presentation() -> void:
	if mode == GameMode.END_SCREEN:
		end_panel.scale = Vector2(0.92, 0.92)
		end_panel.modulate.a = 0.0
		var tween := create_tween()
		tween.set_parallel(true)
		tween.tween_property(end_panel, "scale", Vector2.ONE, 0.34).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		tween.tween_property(end_panel, "modulate:a", 1.0, 0.24)
	elif mode == GameMode.TITLE:
		title_panel.modulate.a = 1.0
		title_panel.position = Vector2(110, 150)
	elif mode == GameMode.PLAYING:
		end_panel.scale = Vector2.ONE
		end_panel.modulate.a = 1.0


func _generate_shoreline() -> Array[Vector2]:
	var crest := randf_range(-40.0, 24.0)
	return [
		Vector2(0, SHORE_Y - randf_range(92.0, 118.0)),
		Vector2(VIEW_SIZE.x * 0.16, SHORE_Y - randf_range(132.0, 168.0)),
		Vector2(VIEW_SIZE.x * 0.31, SHORE_Y - randf_range(188.0, 236.0)),
		Vector2(VIEW_SIZE.x * 0.46, SHORE_Y - randf_range(270.0, 312.0) + crest),
		Vector2(VIEW_SIZE.x * 0.62, SHORE_Y - randf_range(214.0, 258.0)),
		Vector2(VIEW_SIZE.x * 0.78, SHORE_Y - randf_range(152.0, 192.0)),
		Vector2(VIEW_SIZE.x, SHORE_Y - randf_range(118.0, 142.0)),
	]


func _swim_boundary_y(x: float) -> float:
	if shoreline_profile.is_empty():
		return SHORE_Y - 160.0
	if x <= shoreline_profile[0].x:
		return shoreline_profile[0].y
	for i in range(1, shoreline_profile.size()):
		var left := shoreline_profile[i - 1]
		var right := shoreline_profile[i]
		if x <= right.x:
			return lerpf(left.y, right.y, inverse_lerp(left.x, right.x, x))
	return shoreline_profile[-1].y


func _pick_weighted_index(weights: Array) -> int:
	var total := 0.0
	for weight in weights:
		total += float(weight)
	var roll := randf() * total
	for i in range(weights.size()):
		roll -= float(weights[i])
		if roll <= 0.0:
			return i
	return weights.size() - 1


func _roll_fish_weight(species: Dictionary) -> float:
	var bias := pow(randf(), 1.85)
	return snapped(lerpf(species.min, species.max, bias), 0.1)


func _ease_in_out_quad(t: float) -> float:
	if t < 0.5:
		return 2.0 * t * t
	return 1.0 - pow(-2.0 * t + 2.0, 2.0) / 2.0


func _format_time(time_left: float) -> String:
	var minutes := int(floor(time_left / 60.0))
	var seconds := int(floor(fmod(time_left, 60.0)))
	return "%d:%02d" % [minutes, seconds]
