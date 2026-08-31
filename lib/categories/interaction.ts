export type BranchNameAction = "select" | "toggle" | "none";

export type BranchInteraction = {
  nameAction: BranchNameAction;
  showRadio: boolean;
};

export function branchInteraction({
  mobile,
  expandable,
  selectable,
}: {
  mobile: boolean;
  expandable: boolean;
  selectable: boolean;
}): BranchInteraction {
  if (mobile && expandable) {
    return { nameAction: "toggle", showRadio: selectable };
  }

  if (selectable) {
    return { nameAction: "select", showRadio: false };
  }

  return { nameAction: "none", showRadio: false };
}
