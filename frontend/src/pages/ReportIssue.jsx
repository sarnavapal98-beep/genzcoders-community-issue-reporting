import React, { useEffect, useState } from "react";

import {
    predictIssue,
    getCategories,
    createReport
} from "../api";


function ReportIssue() {

    // ==============================
    // Form State
    // ==============================

    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState("");
    const [description, setDescription] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [categories, setCategories] = useState([]);


    // ==============================
    // AI State
    // ==============================

    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(false);


    // ==============================
    // Location State
    // ==============================

    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");

    const [locationStatus, setLocationStatus] = useState(
        "Location not detected"
    );


    // ==============================
    // Submission State
    // ==============================

    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [submittedReport, setSubmittedReport] = useState(null);


    // ==============================
    // Load Categories + Location
    // ==============================

    useEffect(() => {
        loadCategories();
        detectLocation();
    }, []);


    // ==============================
    // Load Categories
    // ==============================

    const loadCategories = async () => {

        try {

            const response = await getCategories();

            console.log("Categories response:", response.data);

            /*
             * Backend may return either:
             *
             * [
             *   { id: 1, name: "pothole" }
             * ]
             *
             * OR:
             *
             * {
             *   categories: [...]
             * }
             */

            const categoryData = Array.isArray(response.data)
                ? response.data
                : response.data.categories || [];

            setCategories(categoryData);

        } catch (error) {

            console.error(
                "Failed to load categories:",
                error
            );

            setErrorMessage(
                "Unable to load issue categories."
            );
        }
    };


    // ==============================
    // Detect Location
    // ==============================

    const detectLocation = () => {

        if (!navigator.geolocation) {

            setLocationStatus(
                "Geolocation is not supported by this browser."
            );

            return;
        }


        setLocationStatus(
            "Detecting location..."
        );


        navigator.geolocation.getCurrentPosition(

            (position) => {

                const lat =
                    position.coords.latitude;

                const lon =
                    position.coords.longitude;


                setLatitude(lat);
                setLongitude(lon);


                setLocationStatus(
                    `Location detected: ${lat.toFixed(5)}, ${lon.toFixed(5)}`
                );
            },

            (error) => {

                console.error(
                    "Location error:",
                    error
                );


                setLocationStatus(
                    "Location permission denied. You can submit without GPS."
                );
            },

            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };


    // ==============================
    // Image Selection
    // ==============================

    const handleImageChange = async (event) => {

        const selectedImage =
            event.target.files[0];


        if (!selectedImage) {
            return;
        }


        // Clear previous messages

        setErrorMessage("");
        setSuccessMessage("");
        setSubmittedReport(null);
        setPrediction(null);


        // ==============================
        // Validate File Type
        // ==============================

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/jpg"
        ];


        if (
            !allowedTypes.includes(
                selectedImage.type
            )
        ) {

            setErrorMessage(
                "Please upload a JPG or PNG image."
            );

            event.target.value = "";

            return;
        }


        // ==============================
        // Validate File Size
        // ==============================

        const maxSize =
            5 * 1024 * 1024;


        if (
            selectedImage.size >
            maxSize
        ) {

            setErrorMessage(
                "Image size must be less than 5 MB."
            );

            event.target.value = "";

            return;
        }


        // ==============================
        // Save Image
        // ==============================

        setImage(selectedImage);


        // ==============================
        // Create Preview
        // ==============================

        const imageURL =
            URL.createObjectURL(
                selectedImage
            );

        setPreview(imageURL);


        // ==============================
        // Run AI Prediction
        // ==============================

        setLoading(true);


        try {

            const response =
                await predictIssue(
                    selectedImage
                );


            console.log(
                "AI response:",
                response.data
            );


            /*
             * Expected backend response:
             *
             * {
             *   success: true,
             *   prediction: {
             *      category: "pothole",
             *      confidence: 94
             *   },
             *   top_predictions: [...]
             * }
             */


            const result =
                response.data;


            // ==============================
            // Check Prediction
            // ==============================

            if (
                result.success &&
                result.prediction
            ) {

                setPrediction(result);


                // Automatically select
                // AI suggested category

                if (
                    result.prediction.category
                ) {

                    setSelectedCategory(
                        result.prediction.category
                    );
                }

            } else {

                setErrorMessage(
                    "AI could not classify this image. Please select a category manually."
                );
            }


        } catch (error) {

            console.error(
                "Prediction failed:",
                error
            );


            if (
                error.response &&
                error.response.data
            ) {

                setErrorMessage(
                    error.response.data.error ||
                    "AI prediction failed."
                );

            } else {

                setErrorMessage(
                    "Unable to connect to the AI server."
                );
            }

        } finally {

            setLoading(false);
        }
    };


    // ==============================
    // Submit Report
    // ==============================

    const handleSubmit = async (event) => {

        event.preventDefault();


        setErrorMessage("");
        setSuccessMessage("");
        setSubmittedReport(null);


        // ==============================
        // Validate Image
        // ==============================

        if (!image) {

            setErrorMessage(
                "Please upload an issue photograph."
            );

            return;
        }


        // ==============================
        // Validate Category
        // ==============================

        if (!selectedCategory) {

            setErrorMessage(
                "Please select an issue category."
            );

            return;
        }


        // ==============================
        // Validate Description
        // ==============================

        if (!description.trim()) {

            setErrorMessage(
                "Please enter a description of the issue."
            );

            return;
        }


        setSubmitting(true);


        try {

            // ==============================
            // Create FormData
            // ==============================

            const formData =
                new FormData();


            // Image

            formData.append(
                "image",
                image
            );


            // Description

            formData.append(
                "description",
                description.trim()
            );


            // Category

            formData.append(
                "category",
                selectedCategory
            );


            // GPS Coordinates

            if (latitude !== "") {

                formData.append(
                    "latitude",
                    latitude
                );
            }


            if (longitude !== "") {

                formData.append(
                    "longitude",
                    longitude
                );
            }


            console.log(
                "Submitting report..."
            );


            // ==============================
            // Send Report
            // ==============================

            const response =
                await createReport(
                    formData
                );


            console.log(
                "Report created:",
                response.data
            );


            // ==============================
            // Check Backend Response
            // ==============================

            if (
                response.data &&
                response.data.success === false
            ) {

                throw new Error(
                    response.data.error ||
                    "Failed to submit report."
                );
            }


            // ==============================
            // Success
            // ==============================

            setSuccessMessage(
                "Your report has been made and submitted successfully."
            );

            setSubmittedReport(
                response.data?.report || null
            );


            // ==============================
            // Reset Form
            // ==============================

            setImage(null);
            setPreview("");
            setDescription("");
            setSelectedCategory("");
            setPrediction(null);


            // ==============================
            // Reset File Input
            // ==============================

            const fileInput =
                document.getElementById(
                    "issue-image"
                );


            if (fileInput) {
                fileInput.value = "";
            }


        } catch (error) {

            console.error(
                "Report submission failed:",
                error
            );


            if (
                error.response &&
                error.response.data
            ) {

                setErrorMessage(
                    error.response.data.error ||
                    error.response.data.message ||
                    "Failed to submit the report."
                );

            } else {

                setErrorMessage(
                    error.message ||
                    "Unable to connect to the server."
                );
            }

        } finally {

            setSubmitting(false);
        }
    };


    // ==============================
    // Render
    // ==============================

    return (

        <div className="report-page">

            <h1>
                Report an Issue
            </h1>


            <p>
                Report potholes, broken street lights,
                water leakage, waste and other community
                issues.
            </p>


            {/* ==============================
                Error Message
            ============================== */}

            {errorMessage && (

                <div className="error-message">

                    {errorMessage}

                </div>
            )}


            {/* ==============================
                Success Message
            ============================== */}

            {successMessage && (

                <div className="success-message report-confirmation" role="status">

                    <div className="confirmation-icon">✓</div>

                    <div>
                        <h2>Report Submitted Successfully</h2>
                        <p>{successMessage}</p>

                        {submittedReport?.ReportID && (
                            <p className="confirmation-id">
                                <strong>Report ID:</strong> {submittedReport.ReportID}
                            </p>
                        )}

                        <p className="confirmation-note">
                            Your report has been recorded and sent to the system for processing.
                        </p>
                    </div>

                </div>
            )}


            <form onSubmit={handleSubmit}>


                {/* ==============================
                    IMAGE UPLOAD
                ============================== */}

                <div className="form-group">

                    <label htmlFor="issue-image">

                        <strong>
                            Upload Issue Photograph
                        </strong>

                    </label>


                    <input
                        id="issue-image"
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={handleImageChange}
                    />


                    <small>
                        JPG or PNG only. Maximum size: 5 MB.
                    </small>

                </div>


                {/* ==============================
                    IMAGE PREVIEW
                ============================== */}

                {preview && (

                    <div className="image-preview">

                        <h3>
                            Image Preview
                        </h3>


                        <img
                            src={preview}
                            alt="Issue preview"
                            style={{
                                width: "300px",
                                maxWidth: "100%",
                                borderRadius: "8px"
                            }}
                        />

                    </div>
                )}


                {/* ==============================
                    AI LOADING
                ============================== */}

                {loading && (

                    <div className="ai-loading">

                        <p>
                            AI is analysing the image...
                        </p>

                        <p>
                            Please wait.
                        </p>

                    </div>
                )}


                {/* ==============================
                    AI RESULT
                ============================== */}

                {prediction && !loading && (

                    <div className="ai-result">

                        <h2>
                            AI Suggested Category
                        </h2>


                        <p>

                            <strong>
                                {
                                    prediction
                                        .prediction
                                        .category
                                }
                            </strong>

                        </p>


                        <p>

                            Confidence:{" "}

                            <strong>

                                {
                                    Number(
                                        prediction
                                            .prediction
                                            .confidence
                                    ).toFixed(2)
                                }%

                            </strong>

                        </p>


                        {/* Low confidence warning */}

                        {
                            Number(
                                prediction
                                    .prediction
                                    .confidence
                            ) < 60 && (

                                <p>

                                    AI confidence is low.
                                    Please verify the category
                                    manually.

                                </p>
                            )
                        }


                        {/* ==============================
                            Other Predictions
                        ============================== */}

                        {
                            prediction.top_predictions &&
                            prediction.top_predictions.length > 0 && (

                                <div>

                                    <h3>
                                        Other Possibilities
                                    </h3>


                                    {
                                        prediction.top_predictions.map(
                                            (item, index) => (

                                                <p key={index}>

                                                    {
                                                        item.category
                                                    }

                                                    {" - "}

                                                    {
                                                        Number(
                                                            item.confidence
                                                        ).toFixed(2)
                                                    }%

                                                </p>
                                            )
                                        )
                                    }

                                </div>
                            )
                        }

                    </div>
                )}


                {/* ==============================
                    CATEGORY
                ============================== */}

                <div className="form-group">

                    <label htmlFor="category">

                        <strong>
                            Issue Category
                        </strong>

                    </label>


                    <select
                        id="category"
                        value={selectedCategory}
                        onChange={(event) =>
                            setSelectedCategory(
                                event.target.value
                            )
                        }
                    >

                        <option value="">
                            Select a category
                        </option>


                        {
                            categories.map(
                                (category, index) => {

                                    const categoryName =
                                        category.name ||
                                        category.Name ||
                                        category.category;


                                    const categoryId =
                                        category.CategoryID ||
                                        category.id ||
                                        category.category_id ||
                                        index;


                                    return (

                                        <option
                                            key={categoryId}
                                            value={categoryName}
                                        >

                                            {categoryName}

                                        </option>

                                    );
                                }
                            )
                        }

                    </select>


                    {prediction && (

                        <small>

                            AI selected the suggested
                            category automatically.
                            You can change it manually.

                        </small>

                    )}

                </div>


                {/* ==============================
                    DESCRIPTION
                ============================== */}

                <div className="form-group">

                    <label htmlFor="description">

                        <strong>
                            Issue Description
                        </strong>

                    </label>


                    <textarea
                        id="description"
                        value={description}
                        onChange={(event) =>
                            setDescription(
                                event.target.value
                            )
                        }
                        placeholder="Describe the issue, for example: Large pothole near the main road causing difficulty for vehicles."
                        rows="5"
                    />

                </div>


                {/* ==============================
                    LOCATION
                ============================== */}

                <div className="location-section">

                    <h2>
                        Location
                    </h2>


                    <p>
                        {locationStatus}
                    </p>


                    {latitude && longitude && (

                        <div>

                            <p>
                                Latitude: {latitude}
                            </p>

                            <p>
                                Longitude: {longitude}
                            </p>

                        </div>

                    )}


                    <button
                        type="button"
                        onClick={detectLocation}
                    >

                        Detect Location Again

                    </button>

                </div>


                {/* ==============================
                    SUBMIT
                ============================== */}

                <div className="submit-section">

                    <button
                        type="submit"
                        disabled={
                            submitting ||
                            loading
                        }
                    >

                        {
                            submitting
                                ? "Submitting Report..."
                                : "Submit Report"
                        }

                    </button>

                </div>


            </form>

        </div>
    );
}


export default ReportIssue;
