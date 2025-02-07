import React, { useState } from "react";
import Papa from "papaparse";
import { Button } from "@mui/material";
import { TableWidget } from "./widgets/TableWidget"; // Import TableWidget from another file

const App = () => {
  const [data, setData] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]); // State for terminal logs

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      const fileContent = e.target?.result as string;

      Papa.parse(fileContent, {
        complete: (result) => {
          console.log("Parsed CSV Data:", result.data);
          const csvData = result.data as any[];

          // Ensure the first row is used as headers if `header: false`
          if (csvData.length > 0) {
            const headers = csvData[0];
            const formattedData = csvData.slice(1).map((row) =>
              headers.reduce((acc: any, header: string, index: number) => {
                acc[header] = row[index];
                return acc;
              }, {})
            );
            setData(formattedData);
          }
        },
        header: false, // Handle headers manually
        skipEmptyLines: true,
        dynamicTyping: true,
      });
    };

    reader.readAsText(file, "UTF-8");
  };

  const handleRun = async () => {
    setIsRunning(true);
    setLogs((prevLogs) => [...prevLogs, "Running operation..."]);

    const campaigns = data.map((row) => ({
      ad_account_id: row["ad_account_id"],
      access_token: row["access_token"],
      adset_count: parseInt(row["adset_count"], 10) || 0,
      page_name: row["page_name"],
      sku: row["sku"],
      material_code: row["material_code"],
      daily_budget: parseInt(row["daily_budget"], 10) || 0,
      facebook_page_id: row["facebook_page_id"],
      video_url: row["video_url"],
      headline: row["headline"],
      primary_text: row["primary_text"],
      image_url: row["image_url"],
      product: row["product"],
    }));

    try {
      const response = await fetch("https://pgoccampaign.share.zrok.io", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          skip_zrok_interstitial: "true",
        },
        body: JSON.stringify({ campaigns }),
      });

      const responseBody = await response.json();
      setLogs((prevLogs) => [
        ...prevLogs,
        `Response Status: ${response.status}`,
      ]);

      if (!response.ok) {
        throw new Error(`Failed to create campaigns: ${response.status}`);
      }

      // Log only the first task from the response as a single-line message
      if (responseBody.tasks && responseBody.tasks.length > 0) {
        setLogs((prevLogs) => [
          ...prevLogs,
          `Task Created: ${responseBody.tasks[0].campaign_name} - Status: ${responseBody.tasks[0].status}`,
        ]);
      } else {
        setLogs((prevLogs) => [...prevLogs, "No task information available."]);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setLogs((prevLogs) => [...prevLogs, `Error: ${error.message}`]);
      } else {
        setLogs((prevLogs) => [...prevLogs, "Unknown error occurred"]);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      [
        "'ad_account_id",
        "'access_token",
        "'adset_count",
        "'page_name",
        "'sku",
        "'material_code",
        "'daily_budget",
        "'facebook_page_id",
        "'video_url",
        "'headline",
        "'primary_text",
        "'image_url",
        "'product",
      ],
      ["'", "'", "'", "'", "'", "'", "'", "'", "'", "'", "'", "'", "'"], // Empty row with apostrophes for template
    ];

    const csvContent = template.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=UTF-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "template.csv";
    link.click();
  };

  return (
    <div className="container mx-auto p-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold">PGOC CAMPAIGN CREATION</h1>
      </div>

      <div className="mt-8 text-gray-700">
        <h2 className="text-xl font-bold">
          Instructions for Using CSV Template
        </h2>
        <ul className="list-disc list-inside">
          <li>
            Download the template by clicking the <b>"Download Template"</b>{" "}
            button.
          </li>
          <li>
            Ensure that all values in the CSV start with an apostrophe (<b>'</b>
            ) to prevent Excel from auto-formatting.
          </li>
          <li>
            Save the CSV file as <b>UTF-8 encoding</b>:
            <ul className="ml-6 list-decimal list-inside">
              <li>
                In Excel, go to <b>File {">"} Save As</b> and select{" "}
                <b>CSV UTF-8 (Comma delimited) (.csv)</b>.
              </li>
              <li>
                In Google Sheets, go to{" "}
                <b>
                  File {">"} Download {">"} Comma-separated values (.csv)
                </b>
                .
              </li>
            </ul>
          </li>
          <li>
            Import the filled CSV file using the <b>"Import CSV"</b> button
            before running the operation.
          </li>
        </ul>
      </div>

      <div className="flex mb-4 gap-4">
        <div className="flex flex-col gap-4 mt-10">
          <Button
            variant="contained"
            color="primary"
            component="label"
            className="py-2 text-white"
            style={{ width: "150px" }}
          >
            Import CSV
            <input type="file" onChange={handleFileUpload} hidden />
          </Button>

          <Button
            variant="contained"
            color="secondary"
            onClick={handleRun}
            disabled={isRunning}
            className="py-2 text-white"
            style={{ width: "150px" }}
          >
            {isRunning ? "Running..." : "Run"}
          </Button>

          <Button
            variant="outlined"
            onClick={handleDownloadTemplate}
            className="py-2 text-black"
            style={{ width: "150px" }}
          >
            Download Template
          </Button>
        </div>

        <div
          className="flex-1 ml-6 mt-4 bg-gray-900 text-white p-4 rounded-md"
          style={{
            height: "200px",
            overflowY: "auto",
            fontFamily: "monospace",
          }}
        >
          <h2 className="text-lg font-bold">Terminal</h2>
          <div>
            {logs.map((log, index) => (
              <p key={index}>{log}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <TableWidget data={data} />
      </div>
    </div>
  );
};

export default App;
