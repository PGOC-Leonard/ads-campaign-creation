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

const formatList = (data: any): string => {
  try {
    if (typeof data === "string") {
      data = JSON.parse(data); // Parse JSON if it's a string
    }

    if (!Array.isArray(data)) return "Invalid format";

    return data
      .map((group) =>
        Array.isArray(group) && group.length > 0
          ? group.join(", ") // Convert array to comma-separated values
          : "No Data,"
      )
      .join("\n"); // Each array group goes on a new line
  } catch (error) {
    return "Invalid format";
  }
};

const StyledTableCell = styled(TableCell)(() => ({
  padding: "12px",
  fontSize: "14px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "200px",
  textAlign: "center",
  verticalAlign: "middle",
  wordWrap: "break-word",
  fontFamily: "Arial, sans-serif",
}));

const StyledTableRow = styled(TableRow)(() => ({
  height: "50px",
  "&:nth-of-type(odd)": {
    backgroundColor: "#f9f9f9",
  },
}));

export const TableWidget: React.FC<TableWidgetProps> = ({ data }) => {
  const headers = [
    "ad_account_id",
    "access_token",
    "page_name",
    "sku",
    "material_code",
    "interests_list",
    "daily_budget",
    "facebook_page_id",
    "video_url",
    "headline",
    "primary_text",
    "image_url",
    "product",
    "start_date (YYYY-MM-DD)",
    "start_time (HH-MM-SS)",
    "excluded_ph_region",
  ];

  return (
    <Card className="shadow-lg">
      <CardContent>
        <TableContainer
          component={Paper}
          style={{ minHeight: "500px", maxHeight: "700px" }}
          className="overflow-auto"
        >
          <Table stickyHeader>
            {/* Table Header */}
            <TableHead>
              <StyledTableRow>
                {headers.map((header, index) => (
                  <StyledTableCell key={index} style={{ fontWeight: "bold" }}>
                    {header}
                  </StyledTableCell>
                ))}
              </StyledTableRow>
            </TableHead>

            <TableBody>
              {data.length === 0 ? (
                <StyledTableRow>
                  <StyledTableCell colSpan={headers.length} align="center">
                    No data available
                  </StyledTableCell>
                </StyledTableRow>
              ) : (
                data.map((row: any, rowIndex: number) => (
                  <StyledTableRow key={rowIndex}>
                    {headers.map((key, cellIndex) => (
                      <StyledTableCell key={cellIndex}>
                        {key === "interests_list" || key === "excluded_ph_region" ? (
                          <Tooltip title={JSON.stringify(row[key], null, 2)} arrow placement="top">
                            <span>{formatList(row[key])}</span>
                          </Tooltip>
                        ) : (
                          <Tooltip title={row[key] ?? ""} arrow placement="top">
                            <span>{row[key] ?? ""}</span>
                          </Tooltip>
                        )}
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
