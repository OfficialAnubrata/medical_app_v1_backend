import axios from "axios";

const ORS_API_KEY = process.env.ORS_API_KEY;
const ORS_API_URL = "https://api.openrouteservice.org/v2/directions/cycling-regular";

/**
 * Fetches road distance (in kilometers) between two coordinates using OpenRouteService.
 * @param {[number, number]} origin - [longitude, latitude]
 * @param {[number, number]} destination - [longitude, latitude]
 * @returns {{ distanceInKm: number } | null}
 */
export const getRoadDistance = async (origin, destination) => {
  try {
    const response = await axios.post(
      ORS_API_URL,
      { coordinates: [origin, destination] },
      {
        headers: {
          Authorization: ORS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const route = response?.data?.routes?.[0];
    const distanceInKm = route?.summary?.distance / 1000;

    return { distanceInKm: parseFloat(distanceInKm.toFixed(2)) };
  } catch (error) {
    console.error("Error fetching distance:", error.response?.data || error.message);
    return null;
  }
};
