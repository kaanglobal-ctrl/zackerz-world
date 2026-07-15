// The fifteen standards of ZACKERZ — the canonical values list.
// Used on the Order (values) page and wherever the values are surfaced.

export interface Value {
  num: string; // roman numeral
  title: string;
  body: string;
}

export const VALUES: Value[] = [
  { num: "I", title: "Loyalty", body: "Stand by each other." },
  { num: "II", title: "Honesty", body: "Tell the truth and act with integrity." },
  { num: "III", title: "Respect", body: "Treat everyone with dignity." },
  { num: "IV", title: "Brotherhood", body: "Brüderlichkeit — build deep trust and support within the team." },
  { num: "V", title: "Unity", body: "Group power — together, we are stronger than any individual." },
  { num: "VI", title: "Discipline", body: "Execute consistently and stay focused." },
  { num: "VII", title: "Ownership", body: "Take responsibility for outcomes." },
  { num: "VIII", title: "Excellence", body: "Strive to do exceptional work." },
  { num: "IX", title: "Innovation", body: "Challenge assumptions and create better solutions." },
  { num: "X", title: "Resilience", body: "Learn from setbacks and keep moving forward." },
  { num: "XI", title: "Courage", body: "Make difficult decisions and take calculated risks." },
  { num: "XII", title: "Service", body: "Create value for customers, teammates, and society." },
  { num: "XIII", title: "Humility", body: "Stay open to learning and feedback." },
  { num: "XIV", title: "Ambition", body: "Think big and pursue meaningful goals." },
  { num: "XV", title: "Merit", body: "Reward contribution, character, and results." },
];
