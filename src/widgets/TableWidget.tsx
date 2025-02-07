import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  CardContent,
  Tooltip,
} from "@mui/material";
import { styled } from "@mui/material/styles";

interface TableWidgetProps {
  data: any[];
}

const StyledTableCell = styled(TableCell)(() => ({
  padding: "16px",
  fontSize: "14px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "150px",
  textAlign: "center", // Center horizontally
  verticalAlign: "middle", // Center vertically
  wordWrap: "break-word", // Allow words to break if they don't fit in the cell
  fontFamily: "Arial, sans-serif", // You can change this to a font that supports emojis
}));

const StyledTableRow = styled(TableRow)(() => ({
  height: "50px",
  "&:nth-of-type(odd)": {
    backgroundColor: "#f9f9f9",
  },
}));

export const TableWidget: React.FC<TableWidgetProps> = ({ data }) => {
  const defaultRow = ["", "", "", "", "", "", "", "", "", "", "", "", ""];

  return (
    <Card className="shadow-lg">
      <CardContent>
        <TableContainer
          component={Paper}
          style={{ minHeight: "500px" }}
          className="overflow-auto"
        >
          <Table>
            {/* Table Header */}
            <TableHead>
              <StyledTableRow
                style={{
                  position: "sticky",
                  top: 0,
                  backgroundColor: "#fff",
                  zIndex: 1,
                }}
              >
                {[
                  "ad_account_id",
                  "access_token",
                  "adset_count",
                  "page_name",
                  "sku",
                  "material_code",
                  "daily_budget",
                  "facebook_page_id",
                  "video_url",
                  "headline",
                  "primary_text",
                  "image_url",
                  "product",
                ].map((header, index) => (
                  <StyledTableCell key={index} style={{ fontWeight: "bold" }}>
                    {header}
                  </StyledTableCell>
                ))}
              </StyledTableRow>
            </TableHead>
            <TableBody>
              {data.length === 0 ? (
                <StyledTableRow>
                  {defaultRow.map((_, cellIndex) => (
                    <StyledTableCell key={cellIndex}>&nbsp;</StyledTableCell>
                  ))}
                </StyledTableRow>
              ) : (
                data.map((row: any, rowIndex: number) => (
                  <StyledTableRow key={rowIndex}>
                    {Object.keys(row).map((key: string, cellIndex: number) => (
                      <StyledTableCell key={cellIndex}>
                        <Tooltip title={row[key] || ""} arrow placement="top">
                          <span>{row[key]}</span>
                        </Tooltip>
                      </StyledTableCell>
                    ))}
                  </StyledTableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};
