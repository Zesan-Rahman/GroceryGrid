import NavBar from "../components/NavBar";
import UploadReceipts from "./UploadReceipt.tsx";

export default function Contribute() {
    return (
        <>
            <NavBar />
            <main className="wide-page">
                <UploadReceipts />
            </main>
        </>
    );
}
