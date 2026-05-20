export const priorities = [
  { value: "critical", label: "Khẩn cấp", rank: 0 },
  { value: "high", label: "Cao", rank: 1 },
  { value: "medium", label: "Trung bình", rank: 2 },
  { value: "low", label: "Thấp", rank: 3 }
];

export function priorityRank(value) {
  return priorities.find((priority) => priority.value === value)?.rank ?? priorities.length;
}
