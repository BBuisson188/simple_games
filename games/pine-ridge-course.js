export const COURSES = {
  summit: {
    name: "Summit Trail",
    grade: "Easy",
    length: 920,
    pace: [22, 35],
    gateWidth: 0.33,
    sky: ["#447992", "#a7cbd2", "#f1dec0"],
    snow: ["#d1e4ed", "#f6faf6"],
    bend: 0.17,
    rows: [
      [75, "gate", 0.00], [136, "gate", -0.42], [196, "gate", 0.39],
      [258, "ramp", 0.35], [283, "rock", 0.35], [318, "gate", -0.26],
      [377, "gate", 0.47], [422, "rock", -0.14], [450, "gate", 0.13],
      [506, "ramp", -0.51], [533, "rock", -0.51], [566, "gate", -0.43],
      [617, "gate", 0.38], [678, "gate", 0.60], [721, "rock", 0.62],
      [754, "gate", -0.19], [807, "gate", -0.49], [860, "gate", 0.14]
    ]
  },
  timber: {
    name: "Timber Cut",
    grade: "Sport",
    length: 1060,
    pace: [28, 47],
    gateWidth: 0.23,
    sky: ["#527b88", "#a5c3b6", "#fcddb0"],
    snow: ["#c1d7db", "#f5f5e9"],
    bend: 0.24,
    rows: [
      [62, "gate", -0.32], [107, "gate", 0.48], [148, "gate", -0.62],
      [198, "ramp", -0.25], [227, "rock", -0.25], [261, "gate", -0.56],
      [307, "gate", 0.44], [347, "gate", -0.41], [391, "rock", 0.30],
      [414, "gate", -0.56], [470, "gate", 0.52], [518, "ramp", 0.35],
      [548, "rock", 0.35], [581, "gate", 0.45], [634, "gate", -0.54],
      [677, "gate", 0.58], [716, "gate", -0.56], [776, "ramp", -0.48],
      [806, "rock", -0.48], [840, "gate", -0.43], [889, "gate", 0.54],
      [931, "gate", -0.61], [970, "gate", 0.62], [1014, "gate", -0.27]
    ]
  },
  blue: {
    name: "Blue Hour",
    grade: "Expert",
    length: 1220,
    pace: [33, 60],
    gateWidth: 0.15,
    sky: ["#1c345e", "#5f739d", "#d6abc2"],
    snow: ["#b7c9e3", "#eef1fc"],
    bend: 0.31,
    rows: [
      [65, "gate", 0.49], [102, "gate", -0.63], [139, "gate", 0.62],
      [194, "ramp", 0.39], [225, "rock", 0.39], [260, "gate", 0.47],
      [295, "gate", -0.66], [330, "gate", 0.63], [365, "gate", -0.60],
      [408, "rock", 0.33], [444, "gate", 0.56], [479, "gate", -0.66],
      [515, "gate", 0.65], [550, "gate", -0.58], [598, "ramp", -0.23],
      [628, "rock", -0.23], [663, "gate", -0.62], [694, "gate", 0.65],
      [726, "gate", -0.67], [758, "gate", 0.65], [790, "gate", -0.64], [822, "gate", 0.65],
      [858, "rock", -0.28], [886, "gate", 0.58], [919, "gate", -0.65],
      [951, "gate", 0.68], [984, "gate", -0.67], [1049, "ramp", -0.51],
      [1082, "rock", -0.51], [1120, "gate", -0.61], [1160, "gate", 0.67]
    ]
  }
};

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const mix = (from, to, amount) => from + (to - from) * amount;
export const courseOffset = (course, meters) => course.bend * (Math.sin(meters / 76) + 0.55 * Math.sin(meters / 39));

export function courseFeatures(course) {
  const features = [];
  for (const [index, [meters, kind, x]] of course.rows.entries()) {
    features.push({ meters, kind, x });
    if (kind === "gate" && index >= 3) {
      const side = x > 0 ? -1 : 1;
      features.push({ meters, kind: index % 3 === 0 ? "pine" : "rock", x: side * (index % 2 ? 0.7 : 0.49) });
      if (course === COURSES.blue && index % 2 === 0) {
        features.push({ meters, kind: "pine", x: side * 0.91 });
      }
    }
  }
  features.push({ meters: course.length, kind: "finish", x: 0 });
  return features;
}
