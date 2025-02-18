import React, { useState } from "react";
import Papa from "papaparse";
import { Button } from "@mui/material";
import { TableWidget } from "./widgets/TableWidget";
import Logo from "./assets/icon.png"; // Import TableWidget from another file

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
              console.log(
                "Raw excluded_ph_region from CSV:",
                item["excluded_ph_region"]
              );
              item["interests_list"] = parseInterestsList(
                item["interests_list"]
              );
              item["excluded_ph_region"] = parseExcludedPHRegion(
                item["excluded_ph_region"]
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
      // Split by "/" and handle empty or space-only groups as "[]"
      const groups = interestsString.split("/").map((group) => {
        const trimmedGroup = group.trim();
        return trimmedGroup === "" ? "[]" : trimmedGroup;
      });

      // Process each group separately
      const parsedArray = groups.map((group) => {
        // If the group is exactly "[]", return an empty array
        if (group === "[]") return [];

        // Otherwise, split by commas and trim each interest
        return group.split(",").map((interest) => interest.trim());
      });

      console.log("Formatted interests_list:", parsedArray);
      return parsedArray;
    } catch (error) {
      console.error("Error parsing interests_list:", interestsString, error);
    }

    return [[]]; // Default to an empty nested array if parsing fails
  };

  // New function to parse the excluded_ph_region
  const parseExcludedPHRegion = (regionString: string): string[][] => {
    if (!regionString || regionString.trim() === "") return [[]];

    console.log("Raw excluded_ph_region before processing:", regionString);

    try {
      // Split by "/" and handle empty or space-only groups as "[]"
      const groups = regionString.split("/").map((group) => {
        const trimmedGroup = group.trim();
        return trimmedGroup === "" ? "[]" : trimmedGroup;
      });

      // Process each group separately
      const parsedArray = groups.map((group) => {
        // If the group is exactly "[]", return an empty array
        if (group === "[]") return [];

        // Otherwise, split by commas and trim each region
        return group.split(",").map((region) => region.trim());
      });

      console.log("Formatted excluded_ph_region:", parsedArray);
      return parsedArray;
    } catch (error) {
      console.error("Error parsing excluded_ph_region:", regionString, error);
    }

    return [[]]; // Default to an empty nested array if parsing fails
  };

  const handleRun = async () => {
    setIsRunning(true);
    setLogs((prevLogs) => [...prevLogs, "Running operation..."]);

    const validCampaigns = data.filter((row) =>
      Object.values(row).every((value) => value !== null && value !== "")
    );

    if (validCampaigns.length === 0) {
      setLogs((prevLogs) => [
        ...prevLogs,
        "Error: No valid campaigns available after filtering null data.",
      ]);
      setIsRunning(false);
      return;
    }

    for (const row of validCampaigns) {
      let parsedInterests = row["interests_list"];
      let parsedExcludedRegions = row["excluded_ph_region"];

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

      const requestBody = {
        user_id: 1, // Static user ID (update if dynamic)
        campaigns: [
          {
            ad_account_id: row["ad_account_id"],
            access_token: row["access_token"],
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
            interests_list: parsedInterests,
            exclude_ph_region: parsedExcludedRegions, // Add parsed excluded_ph_region
            start_date: row["start_date (YYYY-MM-DD)"],
            start_time: row["start_time (HH-MM-SS)"], // Ensure it's a parsed array
          },
        ],
      };

      console.log(`Campaign Data : ${JSON.stringify(requestBody)}`);

      try {
        const response = await fetch(
          "https://pgoccampaign.share.zrok.io/api/v1/campaign/create-campaigns",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              skip_zrok_interstitial: "true",
            },
            body: JSON.stringify(requestBody),
          }
        );

        const contentType = response.headers.get("Content-Type");

        if (!response.ok) {
          setLogs((prevLogs) => [
            ...prevLogs,
            `Error: Failed to create campaign for SKU ${row["sku"]} (Status: ${response.status})`,
          ]);
          console.log(response);
          continue; // Continue to the next campaign even if this one fails
        }

        if (contentType && contentType.includes("application/json")) {
          const responseBody = await response.json();
          setLogs((prevLogs) => [
            ...prevLogs,
            `Response for SKU ${row["sku"]}: Status ${response.status}`,
          ]);
          if (responseBody.tasks && responseBody.tasks.length > 0) {
            console.log(responseBody);
            setLogs((prevLogs) => [
              ...prevLogs,
              `Task Created: ${responseBody.tasks[0].campaign_name} - Status: ${
                responseBody.tasks[0].status
              } - Message: ${JSON.stringify(responseBody.tasks[0])}`,
            ]);
          } else {
            setLogs((prevLogs) => [
              ...prevLogs,
              `No task information available for SKU ${row["sku"]}.`,
            ]);
          }
        } else {
          const textResponse = await response.text();
          setLogs((prevLogs) => [
            ...prevLogs,
            `Error: Expected JSON but received for SKU ${
              row["sku"]
            }: ${JSON.stringify(textResponse)}`,
          ]);
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          setLogs((prevLogs) => [
            ...prevLogs,
            `Error for SKU ${row["sku"]}: ${error.message}`,
          ]);
        } else {
          setLogs((prevLogs) => [
            ...prevLogs,
            `Unknown error occurred for SKU ${row["sku"]}`,
          ]);
        }
      }
    }

    setIsRunning(false);
  };

  const handleDownloadTemplate = () => {
    const template = [
      [
        "ad_account_id",
        "access_token",
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
        "start_date (YYYY-MM-DD)",
        "start_time (HH-MM-SS)",
        "excluded_ph_region",
      ],
      [
        "'",
        "'",
        "'",
        "'",
        "'",
        `"[] / Interest1, Interest2, Interest3 / Interest4, Interest5, Interest6"`, // Changed to use "/"
        "'",
        "'",
        "'",
        "'",
        "'",
        "'",
        "'",
        "YYYY-MM-DD",
        "HH-MM-SS",
        `"Zamboanga Peninsula,Northern Mindanao,Davao Region,Soccsksargen,Caraga,Autonomous Region in Muslim Mindanao"`,
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
      <div className="flex justify-center mb-4">
        <img src={Logo} alt="PGOC Logo" className="h-16 w-auto" />
      </div>
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold">
          PGOC CAMPAIGN CREATION TESTING v1.5
        </h1>
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
            Ensure the `interests_list` and `exclude_ph_region` column follows
            this format: Use `/` as a delimiter between interest groups -
            Example values: -{" "}
            <b>
              `[] / Interest1, Interest2, Interest3 / Interest4, Interest5 `
            </b>
            <li>
              {" "}
              <b>AND `[] / Davao, Mimaropa, Calabrzon / Ilocos, Davao `</b>
            </li>
            <li>
              If all adsets have the same excluded regions don't insert
              delimeter example <b>`Davao, Mimaropa, Calabrzon`</b> If only{" "}
              <b>PH </b> leave it blank or []
            </li>
          </li>
          <li>
            Use <b>[]</b> for empty Interest List or leave it / / space
          </li>
          <li>
            The system will split these values automatically into groups before
            processing.
          </li>
        </ul>
      </div>

      <div className="flex mb-4 gap-4">
        <div className="flex mb-4 gap-4">
          <div className="flex flex-col gap-4 mt-10">
            {/* Green Button */}
            <Button
              variant="contained"
              style={{
                backgroundColor: "green",
                color: "white",
                width: "150px",
              }}
              component="label"
              className="py-2"
            >
              Import CSV
              <input type="file" onChange={handleFileUpload} hidden />
            </Button>

            {/* Red Button */}
            <Button
              variant="contained"
              style={{ backgroundColor: "red", color: "white", width: "150px" }}
              onClick={handleRun}
              disabled={isRunning}
              className="py-2"
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
