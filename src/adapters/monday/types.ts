export type MondayColumnValue = {
  id: string;
  type: string;
  text: string | null;
  value: string | null;
};

export type MondayItem = {
  id: string;
  name: string;
  created_at?: string;
  column_values: MondayColumnValue[];
};

export type MondayRawSnapshot = {
  deals: MondayItem[];
  workOrders: MondayItem[];
};
