import React, { useState } from "react";
import Papa from "papaparse";
import { Button } from "@mui/material";
import { TableWidget } from "./widgets/TableWidget"; // Import TableWidget from another file

const App = () => {
  const [data, setData] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      const fileContent = e.target?.result as string;

      Papa.parse(fileContent, {
        complete: (result) => {
          console.log("Parsed CSV Data:", result.data);
          const csvData = result.data as string[][];

          if (csvData.length > 1) {
            const headers = csvData[0].map((header) => header.trim()); // Trim headers

            const formattedData = csvData.slice(1).map((row) =>
              headers.reduce((acc: any, header: string, index: number) => {
                acc[header] = row[index]?.trim() || ""; // Trim values & handle empty cells
                return acc;
              }, {})
            );

            // Debugging: Check interests_list field before parsing
            formattedData.forEach((item) => {
              console.log(
                "Raw interests_list from CSV:",
                item["interests_list"]
              );
              item["interests_list"] = parseInterestsList(
                item["interests_list"]
              );
            });

            setData(formattedData);
          }
        },
        header: false,
        skipEmptyLines: true,
      });
    };

    reader.readAsText(file, "UTF-8");
  };

  const parseInterestsList = (interestsString: string): string[][] => {
    if (!interestsString || interestsString.trim() === "") return [[]];
  
    console.log("Raw interests_list before processing:", interestsString);
  
    try {
      // ✅ Step 1: Ensure proper JSON format by wrapping words in quotes
      let cleanedString = interestsString
        .trim()
        .replace(/'/g, '"') // Convert single quotes to double quotes
        .replace(/\s*,\s*]/g, "]") // Remove trailing commas before closing brackets
        .replace(/\s*,\s*$/g, "") // Remove extra comma at the end
        .replace(/\[([^\[\]]+)]/g, (match) => {
          // Wrap each word in double quotes inside each []
          return `[${match
            .slice(1, -1)
            .split(",")
            .map((word) => `"${word.trim()}"`)
            .join(", ")}]`;
        });
  
      console.log("Cleaned interests_list:", cleanedString);
  
      // ✅ Step 2: Ensure it starts and ends with brackets
      if (!cleanedString.startsWith("[")) cleanedString = `[${cleanedString}]`;
      if (!cleanedString.endsWith("]")) cleanedString = `${cleanedString}]`;
  
      // ✅ Step 3: Parse JSON
      const parsedArray = JSON.parse(cleanedString);
  
      // ✅ Step 4: Validate output as array of arrays
      if (
        Array.isArray(parsedArray) &&
        parsedArray.every((group) => Array.isArray(group))
      ) {
        const formattedArray = parsedArray.map((group) =>
          group.map((interest) => String(interest).trim())
        );
  
        console.log("Formatted interests_list:", formattedArray);
        return formattedArray;
      }
    } catch (error) {
      console.error("Error parsing interests_list:", interestsString, error);
    }
  
    return [[]]; // Return an empty array inside an array if parsing fails
  };
  

  const handleRun = async () => {
    setIsRunning(true);
    setLogs((prevLogs) => [...prevLogs, "Running operation..."]);
    // console.log(`data:${JSON.stringify(data)}`);

    const campaigns = data
      .filter((row) =>
        Object.values(row).every((value) => value !== null && value !== "")
      )
      .map((row) => {
        let parsedInterests = row["interests_list"];

        if (typeof parsedInterests === "string") {
          try {
            parsedInterests = JSON.parse(parsedInterests);
          } catch (error) {
            console.error(
              "Error parsing interests_list:",
              parsedInterests,
              error
            );
            parsedInterests = [[]]; // Default to empty array if parsing fails
          }
        }

        return {
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
          interests_list: parsedInterests, // Ensure it's a parsed array
        };
      });

    if (campaigns.length === 0) {
      setLogs((prevLogs) => [
        ...prevLogs,
        "Error: No valid campaigns available after filtering null data.",
      ]);
      setIsRunning(false);
      return;
    }

    console.log("Valid Campaigns Payload:", campaigns);

    try {
      const response = await fetch("http://pgoccampaign.share.zrok.io/create-campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          skip_zrok_interstitial: "true",
        },
        body: JSON.stringify({ campaigns }),
      });

      const contentType = response.headers.get("Content-Type");

      if (!response.ok) {
        setLogs((prevLogs) => [
          ...prevLogs,
          `Error: Failed to create campaigns (Status: ${response.status})`,
        ]);
        console.log(response);
        return;
      }

      if (contentType && contentType.includes("application/json")) {
        const responseBody = await response.json();
        setLogs((prevLogs) => [
          ...prevLogs,
          `Response Status: ${response.status}`,
        ]);
        if (responseBody.tasks && responseBody.tasks.length > 0) {
          console.log(responseBody);
          setLogs((prevLogs) => [
            ...prevLogs,
            `Task Created: ${responseBody.tasks[0].campaign_name} - Status: ${responseBody.tasks[0].status} - Message: ${JSON.stringify(responseBody.tasks[0])}`,
          ]);
        } else {
          setLogs((prevLogs) => [
            ...prevLogs,
            "No task information available.",
          ]);
        }
      } else {
        const textResponse = await response.text();
        setLogs((prevLogs) => [
          ...prevLogs,
          `Error: Expected JSON but received: ${JSON.stringify(textResponse)}`,
        ]);
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
        "ad_account_id",
        "access_token",
        "adset_count",
        "page_name",
        "sku",
        "material_code",
        "interests_list", // Moved after material_code
        "daily_budget",
        "facebook_page_id",
        "video_url",
        "headline",
        "primary_text",
        "image_url",
        "product",
      ],
      [
        "'",
        "'",
        "'",
        "'",
        "'",
        "'",
        `"[[Interest1, Interest2, Interest3], [], []]"`, // One single cell
        "'",
        "'",
        "'",
        "'",
        "'",
        "'",
        "'",
      ],
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
        <h1 className="text-3xl font-bold">PGOC CAMPAIGN CREATION TESTING</h1>
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
          <li>
            Ensure the interests_list column contains nested lists correctly.
          </li>
          <li>
            Example:{" "}
            <b>[Self-confidence, Socializing, Beauty], [Yoga, Wellness]</b>
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
