import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { NumberText } from "@/components/NumberText";
import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";

export type TableAlign = "start" | "center" | "end";

export interface ReportTableColumn<RowType extends object> {
  key: keyof RowType & string;
  title: string;
  flex: number;
  align?: TableAlign;
  isNumeric?: boolean;
  formatValue?: (value: RowType[keyof RowType], row: RowType) => string;
  renderCell?: (value: RowType[keyof RowType], row: RowType) => React.ReactNode;
}

interface ReportTableProps<RowType extends object> {
  columns: ReportTableColumn<RowType>[];
  rows: RowType[];
  isRTL: boolean;
  borderColor: string;
  headerTextColor: string;
  rowKey: (row: RowType, index: number) => string;
  numericFontSize?: number;
}

function TableCell({
  flex,
  children,
}: {
  flex: number;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.cellContainer,
        {
          flex,
        },
      ]}
    >
      {children}
    </View>
  );
}

function resolveTextAlign(align: TableAlign | undefined, isRTL: boolean): "left" | "center" | "right" {
  if (align === "center") return "center";
  if (align === "end") return isRTL ? "left" : "right";
  return isRTL ? "right" : "left";
}

function toDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export function ReportTable<RowType extends object>({
  columns,
  rows,
  isRTL,
  borderColor,
  headerTextColor,
  rowKey,
  numericFontSize = 12,
}: ReportTableProps<RowType>) {
  const displayColumns = useMemo(
    () => (isRTL ? [...columns].reverse() : columns),
    [columns, isRTL]
  );

  return (
    <View>
      <View style={[styles.rowBase, styles.headerRow, { borderBottomColor: borderColor }]}>
        {displayColumns.map((col) => (
          <TableCell key={col.key} flex={col.flex}>
            <ThemedText
              semanticVariant="tableHeader"
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                styles.cellTextBase,
                {
                  textAlign: resolveTextAlign(col.align, isRTL),
                  color: headerTextColor,
                },
              ]}
            >
              {col.title}
            </ThemedText>
          </TableCell>
        ))}
      </View>

      {rows.map((row, rowIndex) => (
        <View
          key={rowKey(row, rowIndex)}
          style={[
            styles.rowBase,
            rowIndex < rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor },
          ]}
        >
          {displayColumns.map((col) => {
            const rawValue = row[col.key as keyof RowType];
            const displayValue = col.formatValue ? col.formatValue(rawValue, row) : toDisplayValue(rawValue);
            const align = col.isNumeric ? "center" : resolveTextAlign(col.align, isRTL);

            if (col.renderCell) {
              return (
                <TableCell key={col.key} flex={col.flex}>
                  {col.renderCell(rawValue, row)}
                </TableCell>
              );
            }

            if (col.isNumeric) {
              return (
                <TableCell key={col.key} flex={col.flex}>
                  <NumberText
                    size={numericFontSize}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[
                      styles.cellTextBase,
                      styles.numericCell,
                      {
                        textAlign: align,
                      },
                    ]}
                  >
                    {displayValue}
                  </NumberText>
                </TableCell>
              );
            }

            return (
              <TableCell key={col.key} flex={col.flex}>
                <ThemedText
                  semanticVariant="tableCell"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[
                    styles.cellTextBase,
                    {
                      textAlign: align,
                    },
                  ]}
                >
                  {displayValue}
                </ThemedText>
              </TableCell>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rowBase: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 42,
    paddingVertical: Spacing.xs,
  },
  headerRow: {
    marginTop: Spacing.md,
    paddingBottom: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cellContainer: {
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  cellTextBase: {
    includeFontPadding: false,
    textAlignVertical: "center",
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  numericCell: {
    writingDirection: "ltr",
    fontVariant: ["tabular-nums"],
  },
});
