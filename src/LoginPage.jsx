// src/LoginPage.jsx
import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");

    const { data, error } = await supabase
      .from("Login") // 🔴 REPLACE with real Login table name if different
      .select("*")
      .eq("username", username) // 🔴 REPLACE field names if needed
      .eq("password", password)
      .single();

    if (error || !data) {
      setError("Invalid username or password.");
    } else {
      onLogin(data);
    }
  };

  return (
    <div className="centered-container">
      <div className="card">
        <h1 className="title">FS Edge</h1>

        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
    <br/>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <br/>
        <button onClick={handleLogin}>Login</button>

        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}