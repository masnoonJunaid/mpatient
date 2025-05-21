"use client";
import Image from "next/image";

import { useEffect, useState, useRef } from "react";
import { PGlite } from '@electric-sql/pglite'

// const db = new PGlite() // IndexedDB for persistent frontend-only storage

interface Patient {
  id?: number;
  name: string;
  age: number;
  gender: string;
}

const db = new PGlite("idb://patient-db"); // IndexedDB for persistent frontend-only storage

export default function Home() {

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM patients;");
  const [results, setResults] = useState<any[]>([]);
  const [initialized, setInitialized] = useState(false);
  const bcRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
      runQuery(); 
    const init = async () => {
      await db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    name TEXT,
    age INTEGER,
    gender TEXT
  );
`);

      setInitialized(true);
    };
    init();

    bcRef.current = new BroadcastChannel("pglite_sync");
    bcRef.current.onmessage = () => {
      runQuery();
    };

    return () => {
      bcRef.current?.close();
    };
  }, []);

  const handleSubmit = async () => {
  if (!name || !age || isNaN(Number(age))) return;

  // reset inputs
  const safeName = name.replace(/'/g, "''");
  const safeGender = gender.replace(/'/g, "''");
  const safeAge = parseInt(age, 10);

  try {
    await db.exec(`
      INSERT INTO patients (name, age, gender) 
      VALUES ('${safeName}', ${safeAge}, '${safeGender}');
    `);

    // Broadcast update to other tabs
    bcRef.current?.postMessage("updated");

    // Clear form and refresh results
    setName("");
    setAge("");
    runQuery();
  } catch (err) {
    console.error("Error inserting patient:", err);
  }
};




  const runQuery = async () => {
    const result = await db.query(sqlQuery);
    setResults(result.rows);
  };






  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
       <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Patient Registration</h1>
      <div className="mb-4 flex flex-wrap gap-4"> 
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 mr-2"
        />
        <input
          type="number"
          placeholder="Age"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className="border p-2 mr-2"
        />

        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="border p-2 mr-2"
        >
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
        <button
          onClick={handleSubmit}
          className="bg-blue-500 text-white px-4 py-2"
        >
          Register
        </button>
      </div>

      <div className="mb-4">
        <textarea
          rows={3}
          value={sqlQuery}
          onChange={(e) => setSqlQuery(e.target.value)}
          className="w-full border p-2"
        />
        <button
          onClick={runQuery}
          className="bg-green-500 text-white px-4 py-2 mt-2"
        >
          Run SQL
        </button>
      </div>

      <h2 className="text-xl font-semibold mt-6 mb-2">Results</h2>
      <table className="w-full border max-h-[20vh] overflow-y-auto">
        <thead>
          <tr>
            {results[0] &&
              Object.keys(results[0]).map((col) => (
                <th key={col} className="border px-2 py-1 text-left">
                  {col}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {results.map((row, i) => (
            <tr key={i}>
              {Object.values(row).map((val, j) => (
                <td key={j} className="border px-2 py-1">
                  {val as string}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
      </main>
    </div>
  );
}
