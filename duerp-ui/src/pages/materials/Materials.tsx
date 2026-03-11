import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta.tsx';
import PageBreadcrumb from '../../components/common/PageBreadCrumb.tsx';
import api from '../../api';
import { toast } from 'react-toastify';

// ===================== Types =====================
interface PdfEntry {
    file: File | null;
    documentTitle: string;
}

interface UrlEntry {
    url: string;
    label: string;
}

// ===================== Utils =====================
const getUserData = () => {
    try { return JSON.parse(localStorage.getItem('user_data') || '{}'); }
    catch { return {}; }
};

// ===================== Main Component =====================
const Materials: React.FC = () => {
    const navigate = useNavigate();

    // ===================== States =====================
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [pdfs, setPdfs] = useState<PdfEntry[]>([{ file: null, documentTitle: '' }]);
    const [urls, setUrls] = useState<UrlEntry[]>([{ url: '', label: '' }]);

    // ===================== PDF Handlers =====================
    const addPdf = () => setPdfs([...pdfs, { file: null, documentTitle: '' }]);
    const removePdf = (i: number) => setPdfs(pdfs.filter((_, idx) => idx !== i));
    const updatePdfFile = (i: number, file: File | null) => {
        const updated = [...pdfs];
        updated[i].file = file;
        setPdfs(updated);
    };
    const updatePdfTitle = (i: number, val: string) => {
        const updated = [...pdfs];
        updated[i].documentTitle = val;
        setPdfs(updated);
    };

    // ===================== URL Handlers =====================
    const addUrl = () => setUrls([...urls, { url: '', label: '' }]);
    const removeUrl = (i: number) => setUrls(urls.filter((_, idx) => idx !== i));
    const updateUrl = (i: number, val: string) => {
        const updated = [...urls];
        updated[i].url = val;
        setUrls(updated);
    };
    const updateUrlLabel = (i: number, val: string) => {
        const updated = [...urls];
        updated[i].label = val;
        setUrls(updated);
    };

    // ===================== Validation =====================
    const validateForm = (): string | null => {
        if (!title.trim()) return 'Please enter a material title.';

        for (let i = 0; i < pdfs.length; i++) {
            const pdf = pdfs[i];
            // If a file is selected, document title is required
            if (pdf.file && !pdf.documentTitle.trim()) {
                return `Please enter a document title for PDF #${i + 1}.`;
            }
            // If a document title is entered, file is required
            if (pdf.documentTitle.trim() && !pdf.file) {
                return `Please select a PDF file for entry #${i + 1}.`;
            }
            // Validate file type
            if (pdf.file && !pdf.file.name.toLowerCase().endsWith('.pdf')) {
                return `File #${i + 1} must be a PDF.`;
            }
            // Validate file size (max 10MB)
            if (pdf.file && pdf.file.size > 10 * 1024 * 1024) {
                return `PDF #${i + 1} exceeds the 10MB size limit.`;
            }
        }

        for (let i = 0; i < urls.length; i++) {
            const entry = urls[i];
            if (entry.url.trim() || entry.label.trim()) {
                if (entry.url.trim() && !isValidUrl(entry.url.trim())) {
                    return `URL #${i + 1} is not a valid URL.`;
                }
            }
        }

        return null;
    };

    const isValidUrl = (url: string): boolean => {
        try { new URL(url); return true; }
        catch { return false; }
    };

    // ===================== Submit =====================
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const error = validateForm();
        if (error) { toast.error(error); return; }

        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');
            const userData = getUserData();

            // ✅ multipart/form-data — the ONLY correct way to upload files
            const formData = new FormData();
            formData.append('faculty_id', userData.emp_id || '');
            formData.append('title', title.trim());

            // Append PDFs — only entries that have both file and title
            let pdfIndex = 0;
            pdfs.forEach((entry) => {
                if (entry.file && entry.documentTitle.trim()) {
                    formData.append(`pdfs[${pdfIndex}][file]`, entry.file, entry.file.name);
                    formData.append(`pdfs[${pdfIndex}][document_title]`, entry.documentTitle.trim());
                    pdfIndex++;
                }
            });

            // Append URLs — only entries that have a URL
            let urlIndex = 0;
            urls.forEach((entry) => {
                if (entry.url.trim()) {
                    formData.append(`urls[${urlIndex}][url]`, entry.url.trim());
                    formData.append(`urls[${urlIndex}][label]`, entry.label.trim());
                    urlIndex++;
                }
            });

            // Debug: log what's being sent (won't show file binary, just metadata)
            console.log('=== FormData Payload ===');
            console.log('faculty_id:', userData.emp_id || '');
            console.log('title:', title.trim());
            pdfs.forEach((e, i) => {
                if (e.file) {
                    console.log(`pdfs[${i}][file]:`, {
                        name: e.file.name,
                        size: `${(e.file.size / 1024).toFixed(1)} KB`,
                        type: e.file.type,
                    });
                    console.log(`pdfs[${i}][document_title]:`, e.documentTitle);
                }
            });
            urls.forEach((e, i) => {
                if (e.url.trim()) {
                    console.log(`urls[${i}][url]:`, e.url);
                    console.log(`urls[${i}][label]:`, e.label);
                }
            });

            await api.post('/api/course/save_course_material', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    // ✅ Do NOT manually set Content-Type here.
                    // The browser sets it automatically with the correct boundary:
                    // Content-Type: multipart/form-data; boundary=----FormBoundaryXYZ
                    // If you manually set it, the boundary will be missing and Rust will fail to parse.
                },
            });

            toast.success('✅ Course material saved successfully!');

            // Reset form
            setTitle('');
            setPdfs([{ file: null, documentTitle: '' }]);
            setUrls([{ url: '', label: '' }]);

        } catch (error: any) {
            console.error('Upload error:', error);
            const msg = error.response?.data?.message || error.response?.data?.error || '❌ Failed to save course material.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // ===================== Render =====================
    return (
        <div>
            <PageMeta title="Course Materials | Dashboard" description="Manage and upload course materials" />
            <PageBreadcrumb pageTitle="Course Materials" />

            <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-5 xl:px-10 xl:py-5">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h6 className="text-3xl font-bold mb-1">Course Materials</h6>
                        <p className="text-gray-600">Upload and manage your course materials</p>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-indigo-700"
                    >
                        ← Back
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 pb-24">

                    {/* Material Info */}
                    <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Material Information</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="e.g. Week 2 Lecture Notes"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                required
                            />
                        </div>
                    </div>

                    {/* PDF Documents */}
                    <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="text-lg font-semibold text-gray-800">PDF Documents</h3>
                            <button
                                type="button"
                                onClick={addPdf}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium"
                            >
                                + Add New
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full table-auto border border-gray-200 rounded-xl">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="px-3 py-2 border text-sm font-medium text-gray-700">#</th>
                                        <th className="px-3 py-2 border text-sm font-medium text-gray-700">Document Title</th>
                                        <th className="px-3 py-2 border text-sm font-medium text-gray-700">PDF File</th>
                                        <th className="px-3 py-2 border text-sm font-medium text-gray-700">File Info</th>
                                        <th className="px-3 py-2 border text-sm font-medium text-gray-700">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pdfs.map((entry, i) => (
                                        <tr key={i}>
                                            <td className="px-3 py-2 border text-center text-gray-500 text-sm">{i + 1}</td>
                                            <td className="px-3 py-2 border">
                                                <input
                                                    type="text"
                                                    value={entry.documentTitle}
                                                    onChange={e => updatePdfTitle(i, e.target.value)}
                                                    placeholder="e.g. Chapter 1 Notes"
                                                    className="w-full px-2 py-1 border rounded-lg focus:border-indigo-500 outline-none"
                                                />
                                            </td>
                                            <td className="px-3 py-2 border">
                                                <input
                                                    type="file"
                                                    accept=".pdf,application/pdf"
                                                    onChange={e => updatePdfFile(i, e.target.files?.[0] ?? null)}
                                                    className="w-full px-2 py-1 border rounded-lg focus:border-indigo-500 outline-none text-sm"
                                                />
                                            </td>
                                            <td className="px-3 py-2 border text-sm text-gray-500">
                                                {entry.file ? (
                                                    <div className="space-y-0.5">
                                                        <div className="text-green-600 font-medium truncate max-w-[150px]" title={entry.file.name}>
                                                            ✅ {entry.file.name}
                                                        </div>
                                                        <div className="text-xs text-gray-400">
                                                            {(entry.file.size / 1024).toFixed(1)} KB
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300">No file</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 border text-center">
                                                {pdfs.length > 1 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => removePdf(i)}
                                                        className="px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                                                    >
                                                        Drop
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-300 text-sm">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-gray-400">* Accepted: PDF only. Max size: 10MB per file.</p>
                    </div>

                    {/* Resource URLs */}
                    <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="text-lg font-semibold text-gray-800">Resource URLs</h3>
                            <button
                                type="button"
                                onClick={addUrl}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium"
                            >
                                + Add New
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full table-auto border border-gray-200 rounded-xl">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="px-3 py-2 border text-sm font-medium text-gray-700">#</th>
                                        <th className="px-3 py-2 border text-sm font-medium text-gray-700">Label</th>
                                        <th className="px-3 py-2 border text-sm font-medium text-gray-700">URL</th>
                                        <th className="px-3 py-2 border text-sm font-medium text-gray-700">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {urls.map((entry, i) => (
                                        <tr key={i}>
                                            <td className="px-3 py-2 border text-center text-gray-500 text-sm">{i + 1}</td>
                                            <td className="px-3 py-2 border">
                                                <input
                                                    type="text"
                                                    value={entry.label}
                                                    onChange={e => updateUrlLabel(i, e.target.value)}
                                                    placeholder="e.g. Video Tutorial"
                                                    className="w-full px-2 py-1 border rounded-lg focus:border-indigo-500 outline-none"
                                                />
                                            </td>
                                            <td className="px-3 py-2 border">
                                                <input
                                                    type="url"
                                                    value={entry.url}
                                                    onChange={e => updateUrl(i, e.target.value)}
                                                    placeholder="https://example.com/resource"
                                                    className="w-full px-2 py-1 border rounded-lg focus:border-indigo-500 outline-none"
                                                />
                                            </td>
                                            <td className="px-3 py-2 border text-center">
                                                {urls.length > 1 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeUrl(i)}
                                                        className="px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                                                    >
                                                        Drop
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-300 text-sm">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    Uploading...
                                </>
                            ) : 'Save Material'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default Materials;
