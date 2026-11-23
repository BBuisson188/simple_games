"""Build the Kestrel asset and its presentation scene with Blender in background mode."""

import math
import random
from pathlib import Path

import bmesh
import bpy
from mathutils import Quaternion, Vector


HERE = Path(__file__).resolve().parent
ASSETS = HERE.parents[1] / "assets" / "starfighter-3d"
ASSETS.mkdir(parents=True, exist_ok=True)
random.seed(37)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def collection(name):
    group = bpy.data.collections.new(name)
    scene.collection.children.link(group)
    return group


ship = collection("Kestrel • Flight asset")
studio = collection("Presentation • excluded from GLB")


def material(name, hex_color, metal=0.0, rough=0.5, emission=0.0):
    rgb = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    color = tuple(c / 12.92 if c < 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb) + (1.0,)
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Roughness"].default_value = rough
    if emission:
        bsdf.inputs["Emission Color"].default_value = color
        bsdf.inputs["Emission Strength"].default_value = emission
    return mat


IVORY = material("Ceramic • Chalk", "c9c5b3", 0.28, 0.41)
PALE = material("Ceramic • Bleached replacement panel", "dfd8bf", 0.29, 0.49)
GREY = material("Ceramic • Heat-stained panel", "96998e", 0.38, 0.49)
RED = material("Livery • Oxide red", "9e3e3b", 0.23, 0.45)
RUST = material("Livery • Scuffed red edge", "c46a51", 0.22, 0.50)
EDGE = material("Metal • Satin titanium", "839290", 0.66, 0.37)
DARK = material("Metal • Graphite", "29363c", 0.55, 0.44)
BLACK = material("Joint • Carbon seal", "141d24", 0.15, 0.56)
BRONZE = material("Metal • Burnished copper", "976445", 0.68, 0.41)
GLASS = material("Canopy • Petrol glass", "142d38", 0.37, 0.24)
AMBER = material("Marker • Amber", "ffc17d", emission=2.3)
TEAL = material("Marker • Cyan", "7ce0e7", emission=2.7)
EMITTER = material("Engine • Red emitter", "ff4944", emission=3.0)
CORE = material("Engine • Hot core", "ffac81", emission=5.0)


def add_weathering(mat, hex_color):
    size = 256
    rng = random.Random(81)
    rgb = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    grains = [rng.uniform(-0.022, 0.022) for _ in range(size * size)]
    for _ in range(145):
        x, y = rng.randrange(size), rng.randrange(size)
        change = rng.choice((-0.19, -0.12, 0.13))
        for along in range(rng.randint(3, 16)):
            grains[((y + along) % size) * size + (x + along // 5) % size] += change * (1 - along / 20)
    pixels = []
    for i, grain in enumerate(grains):
        u, v = (i % size) / size, (i // size) / size
        mottling = 0.045 * math.sin(2 * math.pi * (u * 3 + v)) * math.cos(v * math.tau * 4)
        stain = 0.034 * math.sin(u * math.tau * 6) * math.sin(v * math.tau * 2)
        pixels.extend([max(0, min(1, channel + grain + mottling - stain)) for channel in rgb] + [1.0])
    image = bpy.data.images.new(f"{mat.name} • Surface", width=size, height=size, alpha=False)
    image.pixels.foreach_set(pixels)
    image.pack()
    nodes = mat.node_tree.nodes
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    mat.node_tree.links.new(texture.outputs["Color"], nodes.get("Principled BSDF").inputs["Base Color"])


for surface, color in ((IVORY, "aba894"), (PALE, "c4bda5"), (GREY, "82877e"), (RED, "94443c")):
    add_weathering(surface, color)


def mesh(name, vertices, faces, mat, group=ship, recalc=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    if recalc:
        bm = bmesh.new()
        bm.from_mesh(data)
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        bm.to_mesh(data)
        bm.free()
    data.materials.append(mat)
    data.update()
    if group == ship:
        uv = data.uv_layers.new(name="Surface projection")
        for face in data.polygons:
            major = max(range(3), key=lambda i: abs(face.normal[i]))
            axes = [i for i in range(3) if i != major]
            for loop_id in face.loop_indices:
                point = data.vertices[data.loops[loop_id].vertex_index].co
                uv.data[loop_id].uv = (point[axes[0]] * 0.46, point[axes[1]] * 0.46)
    obj = bpy.data.objects.new(name, data)
    group.objects.link(obj)
    return obj


def block(name, at, dims, mat, group=ship):
    x, y, z = at
    a, b, c = (d / 2 for d in dims)
    verts = [(x + i * a, y + j * b, z + k * c) for k in (-1, 1) for i, j in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    return mesh(name, verts, [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], mat, group)


def plate(name, coords, thickness, mat):
    n = len(coords)
    vertices = coords + [(x, y, z - thickness) for x, y, z in coords]
    faces = [tuple(range(n)), tuple(reversed(range(n, n * 2)))]
    faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    return mesh(name, vertices, faces, mat)


def pipe(name, a, b, radius, mat, sides=10):
    start, end = Vector(a), Vector(b)
    rotation = (end - start).to_track_quat("Z", "Y")
    offsets = [rotation @ Vector((radius * math.cos(t * math.tau / sides),
                                   radius * math.sin(t * math.tau / sides), 0)) for t in range(sides)]
    vertices = [point + offset for point in (start, end) for offset in offsets]
    faces = [tuple(reversed(range(sides))), tuple(range(sides, sides * 2))]
    faces += [(i, (i + 1) % sides, (i + 1) % sides + sides, i + sides) for i in range(sides)]
    obj = mesh(name, vertices, faces, mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = len(polygon.vertices) == 4
    return obj


def hull(name, sections, mat):
    vertices = []
    for y, width, top, bottom in sections:
        h = top - bottom
        vertices.extend((x, y, z) for x, z in (
            (-width * 0.67, top), (width * 0.67, top), (width, top - h * 0.28), (width, bottom + h * 0.29),
            (width * 0.62, bottom), (-width * 0.62, bottom), (-width, bottom + h * 0.29), (-width, top - h * 0.28)
        ))
    faces = [tuple(reversed(range(8))), tuple(range(len(vertices) - 8, len(vertices)))]
    for ring in range(len(sections) - 1):
        for i in range(8):
            j = (i + 1) % 8
            offset = ring * 8
            faces.append((offset + i, offset + j, offset + j + 8, offset + i + 8))
    return mesh(name, vertices, faces, mat)


def annulus(name, x, z, profile, side_count, mat):
    verts = [(x + r * math.cos(t * math.tau / side_count), y, z + r * math.sin(t * math.tau / side_count))
             for y, r in profile for t in range(side_count)]
    faces = [(ring * side_count + i, ring * side_count + (i + 1) % side_count,
              (ring + 1) * side_count + (i + 1) % side_count, (ring + 1) * side_count + i)
             for ring in range(len(profile) - 1) for i in range(side_count)]
    return mesh(name, verts, faces, mat, recalc=False)


# A shallow arrowhead hull with a squarer aft body and a forward-facing canopy.
hull("01 • Main pressure hull", [
    (-2.76, 0.89, 0.34, -0.42), (-1.85, 1.09, 0.59, -0.51),
    (0.65, 1.08, 0.61, -0.52), (2.64, 0.87, 0.57, -0.42),
    (4.26, 0.45, 0.31, -0.20), (4.80, 0.23, 0.12, -0.09)
], IVORY)
hull("02 • Keel", [
    (-2.70, 0.65, -0.13, -0.53), (-1.42, 0.86, -0.10, -0.74),
    (0.94, 0.64, -0.11, -0.67), (3.62, 0.27, -0.09, -0.29)
], DARK)
hull("03 • Framed canopy base", [
    (0.43, 0.66, 0.63, 0.53), (0.98, 0.61, 0.85, 0.54), (1.82, 0.51, 0.95, 0.51),
    (2.58, 0.41, 0.66, 0.45), (2.95, 0.28, 0.53, 0.39)
], EDGE)
hull("04 • Faceted canopy", [
    (0.67, 0.53, 0.70, 0.64), (1.07, 0.54, 0.99, 0.65), (1.83, 0.46, 1.09, 0.60),
    (2.44, 0.35, 0.87, 0.57), (2.72, 0.26, 0.65, 0.53)
], GLASS)
pipe("Canopy spine", (0, 0.72, 0.72), (0, 1.13, 1.015), 0.027, DARK, 6)
pipe("Canopy spine", (0, 1.13, 1.015), (0, 1.83, 1.112), 0.027, DARK, 6)
pipe("Canopy spine", (0, 1.83, 1.112), (0, 2.48, 0.883), 0.027, DARK, 6)


def wing_shape(side, points):
    return [(side * x, y, z) for x, y, z in points]


for s in (-1, 1):
    wing = [(0.77, 1.20, 0.19), (2.71, 0.93, 0.11), (4.96, -0.57, 0.26),
            (5.40, -1.22, 0.32), (4.75, -1.91, 0.30), (3.72, -1.81, 0.10),
            (2.96, -2.26, -0.03), (1.01, -2.33, -0.18)]
    plate("05 • Swept wing", wing_shape(s, wing), 0.24, DARK)
    plate("06 • Shoulder fairing", wing_shape(s, [(0.80, 1.39, 0.28), (1.65, 1.16, 0.25),
          (2.38, 0.51, 0.24), (2.56, -1.65, 0.06), (2.01, -2.20, 0.03), (0.95, -2.13, 0.08)]), 0.17, GREY)
    plate("07 • Inner wing skin", wing_shape(s, [(2.01, 0.97, 0.20), (2.72, 0.91, 0.18), (3.30, 0.49, 0.21),
          (3.63, -1.33, 0.18), (2.98, -1.81, 0.12), (2.45, -1.53, 0.11)]), 0.07, IVORY)
    plate("08 • Outer wing skin", wing_shape(s, [(2.82, 0.82, 0.18), (4.90, -0.61, 0.30), (5.35, -1.25, 0.36),
          (4.76, -1.80, 0.35), (3.72, -1.67, 0.20), (3.38, -1.01, 0.19)]), 0.08, PALE)
    plate("09 • Livery wedge", wing_shape(s, [(3.38, 0.45, 0.247), (4.56, -0.36, 0.322), (4.30, -0.50, 0.341),
          (3.74, -0.96, 0.282), (3.59, -0.69, 0.271), (3.93, -0.38, 0.326)]), 0.024, RED)
    plate("10 • Trailing deflector", wing_shape(s, [(2.42, -1.49, 0.145), (3.41, -1.39, 0.209),
          (3.73, -1.69, 0.224), (3.00, -2.08, 0.11), (2.40, -2.16, 0.02)]), 0.10, GREY)
    plate("Wing maintenance panel", wing_shape(s, [(3.87, -0.88, 0.30), (4.31, -0.82, 0.34),
          (4.53, -1.22, 0.37), (4.13, -1.25, 0.33)]), 0.035, GREY)
    plate("Wingtip sensor cap", wing_shape(s, [(4.82, -0.74, 0.33), (5.34, -1.24, 0.37),
          (4.91, -1.60, 0.36), (4.75, -1.28, 0.35)]), 0.14, DARK)
    pipe("Wingtip navigation diode", (s * 5.09, -1.24, 0.385), (s * 5.23, -1.28, 0.39), 0.042, AMBER if s < 0 else TEAL)

    # Twin dorsal fins give the rear view a recognizable shape independent of its paint.
    plate("11 • Canted dorsal stabilizer", wing_shape(s, [(2.71, -0.73, 0.21), (3.26, -1.06, 1.21),
          (3.41, -1.61, 1.31), (3.20, -2.19, 0.27), (2.75, -2.12, 0.13)]), 0.11, GREY)
    plate("12 • Oxide fin cap", wing_shape(s, [(3.16, -1.02, 1.03), (3.275, -1.06, 1.24),
          (3.425, -1.61, 1.34), (3.39, -1.75, 1.11)]), 0.04, RED)
    plate("13 • Forward ceramic cheek", wing_shape(s, [(0.47, 2.54, 0.59), (0.74, 2.58, 0.60),
          (0.43, 4.20, 0.37), (0.24, 4.49, 0.26), (0.31, 3.53, 0.44)]), 0.065, PALE)
    plate("Nose paint wedge", wing_shape(s, [(0.57, 2.84, 0.591), (0.64, 2.94, 0.575),
          (0.42, 3.90, 0.433), (0.34, 4.05, 0.398)]), 0.04, RED)
    for i in range(5):
        x = s * (3.86 + 0.14 * i)
        y = -1.57 - 0.012 * i
        pipe("Wing slat ceramic fastener", (x, y, 0.255 + 0.013 * i),
             (x, y, 0.28 + 0.013 * i), 0.023, EDGE, 6)

    # Two deeply recessed, petaled nozzles. Separate named emission materials are
    # available for throttle and boost without introducing an external texture.
    x, z = s * 1.65, 0.065
    annulus("14 • Engine graphite housing", x, z, [(0.22, 0.29), (0.03, 0.55), (-0.45, 0.67),
            (-1.43, 0.69), (-2.30, 0.62), (-2.55, 0.58)], 28, DARK)
    annulus("15 • Ceramic nacelle jacket", x, z, [(-0.06, 0.59), (-0.42, 0.684),
            (-0.88, 0.710), (-1.31, 0.71), (-1.46, 0.68)], 24, IVORY)
    for y, radius in [(-0.23, 0.664), (-0.92, 0.72), (-1.42, 0.70), (-1.73, 0.65), (-2.08, 0.624)]:
        annulus("Engine band", x, z, [(y + 0.033, radius - 0.016), (y + 0.015, radius),
                (y - 0.04, radius), (y - 0.075, radius - 0.021)], 24, EDGE)
    annulus("16 • Oxide shield", x, z, [(-1.47, 0.68), (-1.58, 0.666), (-1.68, 0.644)], 24, RED)
    annulus("17 • Copper throat", x, z, [(-2.08, 0.597), (-2.30, 0.62), (-2.58, 0.685), (-2.70, 0.68)], 24, BRONZE)
    annulus("18 • Recessed exhaust", x, z, [(-2.69, 0.681), (-2.73, 0.57), (-2.51, 0.50),
            (-2.42, 0.34), (-2.395, 0.005)], 28, BLACK)
    annulus("19 • Engine light ring", x, z, [(-2.61, 0.49), (-2.59, 0.447), (-2.56, 0.32)], 28, EMITTER)
    annulus("20 • Engine luminous core", x, z, [(-2.55, 0.33), (-2.51, 0.18), (-2.51, 0.002)], 28, CORE)
    for i in range(14):
        t = i * math.tau / 14
        u, v = math.cos(t), math.sin(t)
        pipe("Nozzle actuator rail", (x + u * 0.596, -1.77, z + v * 0.596),
             (x + u * 0.673, -2.60, z + v * 0.673), 0.034, EDGE if i % 3 == 0 else DARK, 5)
        pipe("Engine rim pin", (x + u * 0.605, -2.70, z + v * 0.605),
             (x + u * 0.605, -2.744, z + v * 0.605), 0.026, EDGE, 6)
    for yy in (-0.62, -0.73, -1.07, -1.18):
        block("Engine dorsal access slot", (x, yy, z + 0.704), (0.39, 0.032, 0.022), BLACK)
    pipe("Exposed oxidized coolant line", (s * 1.04, -2.61, 0.27), (s * 1.04, -1.35, 0.56), 0.055, BRONZE, 9)
    pipe("Exposed aft coolant line", (s * 1.06, -2.61, -0.01), (s * 1.12, -1.55, -0.35), 0.05, EDGE, 9)


block("21 • Dorsal heat exchanger bed", (0, -0.82, 0.603), (0.94, 1.95, 0.086), BLACK)
for y in (-1.78, 0.13):
    block("Heat exchanger guard", (0, y, 0.70), (1.06, 0.13, 0.10), EDGE)
for s in (-1, 1):
    block("Heat exchanger guard", (s * 0.48, -0.82, 0.695), (0.13, 1.94, 0.09), IVORY)
for i in range(12):
    y = -1.67 + i * 0.156
    block("Cooling fin", (0, y, 0.688), (0.75, 0.045, 0.118), EDGE if i % 4 == 0 else DARK)
block("22 • Aft avionics bay", (0, -2.763, -0.015), (1.13, 0.12, 0.57), BLACK)
for i in range(9):
    block("Aft cooling grille", ((i - 4) * 0.12, -2.846, -0.02), (0.05, 0.04, 0.41), EDGE if i % 3 == 0 else DARK)
for x in (-0.66, 0.66):
    block("Aft navigation strip", (x, -2.80, 0.043), (0.066, 0.075, 0.23), RED)
    block("Aft navigation strip lens", (x, -2.845, 0.089), (0.037, 0.015, 0.11), AMBER)
for sign in (-1, 1):
    plate("Raised tail armor", wing_shape(sign, [(0.55, -2.59, 0.392), (0.79, -2.52, 0.403),
          (0.97, -1.91, 0.598), (0.91, -1.43, 0.619), (0.61, -1.61, 0.632)]), 0.061, PALE)
    plate("Dorsal red panel", wing_shape(sign, [(0.61, -1.51, 0.635), (0.92, -1.39, 0.635),
          (0.89, -0.94, 0.644), (0.61, -1.04, 0.647)]), 0.045, RED)
    for y in (-2.50, -1.87, -1.34):
        z = 0.686 if y > -1.7 else 0.651 if y > -2 else 0.432
        pipe("Tail panel locking stud", (sign * 0.75, y, z), (sign * 0.75, y, z + 0.025), 0.028, DARK, 6)
for y, z, w, depth in ((2.96, 0.56, 0.64, 0.24), (3.28, 0.509, 0.58, 0.25), (3.64, 0.452, 0.52, 0.30),
                       (3.97, 0.397, 0.42, 0.26), (4.25, 0.343, 0.34, 0.22)):
    plate("Forward replacement panel", [(-w / 2, y, z), (w / 2, y, z), (w * 0.43, y + depth, z - 0.042),
          (-w * 0.43, y + depth, z - 0.042)], 0.045, random.choice([IVORY, PALE, GREY]))


def socket(name, at):
    node = bpy.data.objects.new(name, None)
    node.location = at
    node.empty_display_size = 0.22
    ship.objects.link(node)


socket("Thruster_L", (-1.65, -2.72, 0.065))
socket("Thruster_R", (1.65, -2.72, 0.065))
socket("Pulse_L", (-0.48, 4.23, -0.18))
socket("Pulse_R", (0.48, 4.23, -0.18))
socket("Chase_Target", (0, 1.65, 0.72))


def light(kind, name, at, color, energy, size=1, aim=(0, 0, 0)):
    data = bpy.data.lights.new(name, kind)
    data.color = color
    data.energy = energy
    if kind == "AREA":
        data.shape = "DISK"
        data.size = size
    else:
        data.shadow_soft_size = size
    obj = bpy.data.objects.new(name, data)
    studio.objects.link(obj)
    obj.location = at
    obj.rotation_euler = (Vector(aim) - obj.location).to_track_quat("-Z", "Y").to_euler()


light("AREA", "Warm sun key", (-5, -1, 9), (1, 0.85, 0.68), 2500, 4)
light("AREA", "Cold rim", (6, 3, 5), (0.53, 0.76, 1), 3200, 4)
light("AREA", "Tail and intake fill", (0, -7, 4), (0.71, 0.83, 1), 1400, 6)
for s in (-1, 1):
    light("POINT", "Engine spill", (s * 1.65, -3, 0.08), (1, 0.12, 0.074), 26, 0.40)


# Stars and dusk-colored rocks are only present in the preview scene.
star = material("Preview • Star", "c8e0ff", emission=1.8)
dim_star = material("Preview • Distant star", "7084a3", emission=0.85)
for level, mat in enumerate((dim_star, star)):
    vertices, faces = [], []
    for _ in range((640, 130)[level]):
        x, z = random.uniform(-180, 180), random.uniform(-110, 90)
        y = random.uniform(130, 175)
        size = random.uniform(0.020, 0.10) * (0.68 + level * 0.46)
        ix = len(vertices)
        vertices.extend(((x - size, y, z), (x, y, z - size), (x + size, y, z), (x, y, z + size)))
        faces.append((ix, ix + 1, ix + 2, ix + 3))
    mesh("Starfield", vertices, faces, mat, studio, recalc=False)

rock = material("Preview • Basalt", "554e50", 0.12, 0.93)
for i, (x, y, z, size) in enumerate([
    (-15, 13, -8, 4.0), (14, 15, -7, 3.2), (6, 25, -9, 2.1),
    (-9, 31, -5, 2.7), (16, 46, -9, 4.5), (-31, 49, -5, 5.0),
    (-3, 40, -7, 1.8), (-12, 48, -3, 1.6), (26, 69, -8, 3.6), (1, 58, -3, 1.3),
    (-20, 71, -7, 1.7), (18, 34, -13, 3.8), (-18, 22, -10, 2.9),
]):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=2, radius=size)
    q = Quaternion((0.35, 0.61, 0.71), i * 0.44)
    for v in bm.verts:
        v.co = q @ (v.co * random.uniform(0.78, 1.18)) + Vector((x, y, z))
    bm.verts.index_update()
    mesh("Backdrop asteroid", [v.co[:] for v in bm.verts],
         [tuple(v.index for v in face.verts) for face in bm.faces], rock, studio)
    bm.free()


def camera(name, at, target, lens):
    data = bpy.data.cameras.new(name)
    data.lens = lens
    data.clip_end = 260
    obj = bpy.data.objects.new(name, data)
    studio.objects.link(obj)
    obj.location = at
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()
    return obj


scene.camera = camera("Chase • level flight", (0, -17.5, 6.5), (0, 2.3, 0.95), 40)
inspection = camera("Inspection • port rear", (11.0, -15.5, 9.0), (0, 0.0, 0.1), 44)
world = bpy.data.worlds.new("Soft starlight")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.011, 0.018, 0.035, 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.34
scene.world = world
scene.render.engine = "CYCLES"
scene.cycles.samples = 20
scene.cycles.use_denoising = True
scene.render.threads_mode = "FIXED"
scene.render.threads = 8
scene.render.resolution_x = 1344
scene.render.resolution_y = 816
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "JPEG"
scene.render.image_settings.quality = 92
scene.render.filepath = str(HERE / "kestrel-chase.jpg")
scene.view_settings.view_transform = "AgX"

# Blender 5 uses per-scene compositor node groups.
if hasattr(scene, "compositing_node_group"):
    graph = bpy.data.node_groups.new("Engine bloom • preview", "CompositorNodeTree")
    graph.interface.new_socket(name="Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    scene.compositing_node_group = graph
    layers = graph.nodes.new("CompositorNodeRLayers")
    glare = graph.nodes.new("CompositorNodeGlare")
    glare.inputs["Type"].default_value = "Fog Glow"
    glare.inputs["Quality"].default_value = "High"
    glare.inputs["Threshold"].default_value = 1.6
    output = graph.nodes.new("NodeGroupOutput")
    graph.links.new(layers.outputs["Image"], glare.inputs["Image"])
    graph.links.new(glare.outputs["Image"], output.inputs["Image"])

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(HERE / "kestrel.blend"), compress=True)
bpy.ops.render.render(write_still=True)
scene.camera = inspection
scene.render.filepath = str(HERE / "kestrel-detail.jpg")
bpy.ops.render.render(write_still=True)

# Keep detail objects editable in the .blend. Batch the exported mesh by
# material into a single object so Blender's authoring hierarchy stays cheap at runtime.
bpy.ops.object.select_all(action="DESELECT")
parts = [obj for obj in ship.objects if obj.type == "MESH"]
for part in parts:
    part.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
model = bpy.context.object
model.name = "Kestrel_Interceptor"
for obj in ship.objects:
    obj.select_set(True)
model.data.calc_loop_triangles()
print(f"KESTREL TRIANGLES {len(model.data.loop_triangles)} MATERIALS {len(model.data.materials)}", flush=True)
bpy.ops.export_scene.gltf(filepath=str(ASSETS / "kestrel.glb"), use_selection=True, export_cameras=False,
                          export_lights=False, export_animations=False, export_yup=True)
