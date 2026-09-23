export const choreState = {
  assignments: {
    groupA: "me",
    groupB: "partner",
  },

  tasks: [
    {
      id: "task-1",
      group: "groupA",
      name: "食器洗い",
      status: "pending",
      isActive: true,
      sortOrder: 1,
    },
    {
      id: "task-2",
      group: "groupA",
      name: "ゴミ出し",
      status: "pending",
      isActive: true,
      sortOrder: 2,
    },
    {
      id: "task-3",
      group: "groupA",
      name: "キッチン掃除",
      status: "done",
      isActive: true,
      sortOrder: 3,
    },
    {
      id: "task-4",
      group: "groupB",
      name: "洗濯",
      status: "pending",
      isActive: true,
      sortOrder: 1,
    },
    {
      id: "task-5",
      group: "groupB",
      name: "掃除機",
      status: "done",
      isActive: true,
      sortOrder: 2,
    },
    {
      id: "task-6",
      group: "groupB",
      name: "トイレ掃除",
      status: "pending",
      isActive: true,
      sortOrder: 3,
    },
  ],
};