import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

interface GooglePayload {
  email: string;
  name: string;
  picture: string;
}

export default function SignInWithGoogle() {
  const handleSuccess = (credentialResponse: any) => {
    if (!credentialResponse.credential) return;
    const decoded: GooglePayload = jwtDecode(credentialResponse.credential);
    console.log("User Info:", decoded);

    // 🚨 Send token to your backend for verification & login
    fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // allows cookie storage
      body: JSON.stringify({ token: credentialResponse.credential }),
    });
  };

  return (
    <GoogleLogin
      shape="pill"
      onSuccess={handleSuccess}
      onError={() => console.log("Google Login Failed")}
    />
  );
}
