import React, { memo, useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

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
  minWidth?: number;
  compact?: boolean;
}

interface ReportTableRowProps<RowType extends object> {
  row: RowType;
  rowIndex: number;
  rowCount: number;
  displayColumns: ReportTableColumn<RowType>[];
  isRTL: boolean;
  borderColor: string;
  numericFontSize: number;
  compact: boolean;
}

function TableCell({
  flex,
  compact,
  children,
}: {
  flex: number;
  compact: boolean;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.cellContainer,
        compact && styles.cellContainerCompact,
        {
          flex,
        },
      ]}
    >
      {children}
    </View>
  );
}

function resolveTextAlign(
  align: TableAlign | undefined,
  isRTL: boolean,
): "left" | "center" | "right" {
  if (align === "center") return "center";
  if (align === "end") return isRTL ? "left" : "right";
  return isRTL ? "right" : "left";
}

function toDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function ReportTableRowComponent<RowType extends object>({
  row,
  rowIndex,
  rowCount,
  displayColumns,
  isRTL,
  borderColor,
  numericFontSize,
  compact,
}: ReportTableRowProps<RowType>) {
  return (
    <View
      style={[
        styles.rowBase,
        compact && styles.rowBaseCompact,
        rowIndex < rowCount - 1 && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: borderColor,
        },
      ]}
    >
      {displayColumns.map((col) => {
        const rawValue = row[col.key as keyof RowType];
        const displayValue = col.formatValue
          ? col.formatValue(rawValue, row)
          : toDisplayValue(rawValue);
        const align = col.isNumeric
          ? "center"
          : resolveTextAlign(col.align, isRTL);

        if (col.renderCell) {
          return (
            <TableCell key={col.key} flex={col.flex} compact={compact}>
              {col.renderCell(rawValue, row)}
            </TableCell>
          );
        }

        if (col.isNumeric) {
          return (
            <TableCell key={col.key} flex={col.flex} compact={compact}>
              <NumberText
                size={numericFontSize}
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.cellTextBase,
                  compact && styles.cellTextCompact,
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
          <TableCell key={col.key} flex={col.flex} compact={compact}>
            <ThemedText
              semanticVariant="tableCell"
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                styles.cellTextBase,
                compact && styles.cellTextCompact,
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
  );
}

const ReportTableRow = memo(
  ReportTableRowComponent,
) as typeof ReportTableRowComponent;

export function ReportTable<RowType extends object>({
  columns,
  rows,
  isRTL,
  borderColor,
  headerTextColor,
  rowKey,
  numericFontSize = 12,
  minWidth,
  compact = false,
}: ReportTableProps<RowType>) {
  const displayColumns = useMemo(
    () => (isRTL ? [...columns].reverse() : columns),
    [columns, isRTL],
  );

  return (
    <ScrollView
      horizontal={Boolean(minWidth)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={minWidth ? { minWidth } : undefined}
    >
      <View style={styles.table}>
        <View
          style={[
            styles.rowBase,
            styles.headerRow,
            compact && styles.rowBaseCompact,
            compact && styles.headerRowCompact,
            { borderBottomColor: borderColor },
          ]}
        >
          {displayColumns.map((col) => (
            <TableCell key={col.key} flex={col.flex} compact={compact}>
              <ThemedText
                semanticVariant="tableHeader"
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.cellTextBase,
                  compact && styles.cellTextCompact,
                  compact && styles.headerTextCompact,
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
          <ReportTableRow
            key={rowKey(row, rowIndex)}
            row={row}
            rowIndex={rowIndex}
            rowCount={rows.length}
            displayColumns={displayColumns}
            isRTL={isRTL}
            borderColor={borderColor}
            numericFontSize={numericFontSize}
            compact={compact}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  table: {
    width: "100%",
  },
  rowBase: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 42,
    paddingVertical: Spacing.xs,
  },
  rowBaseCompact: {
    minHeight: 36,
    paddingVertical: 3,
  },
  headerRow: {
    marginTop: Spacing.md,
    paddingBottom: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRowCompact: {
    marginTop: Spacing.sm,
    paddingBottom: 4,
  },
  cellContainer: {
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  cellContainerCompact: {
    minHeight: 28,
    paddingHorizontal: 2,
  },
  cellTextBase: {
    includeFontPadding: false,
    textAlignVertical: "center",
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  cellTextCompact: {
    lineHeight: 17,
    paddingHorizontal: 2,
  },
  headerTextCompact: {
    fontSize: 11,
  },
  numericCell: {
    writingDirection: "ltr",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
});
