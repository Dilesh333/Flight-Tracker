document.addEventListener("DOMContentLoaded", () => {
  const API_KEY = "e6914b2125479444755d8d72654ba0fb";
  const API_URL = "https://api.aviationstack.com/v1/flights";

  //StateManagement
  let currentView = "search";
  let currentFetchFlights = [];
  let favorites = JSON.parse(localStorage.getItem("flightFavorites")) || [];

  //Dom element
  const tabSearch = document.getElementById("tabSearch");
  const tabFavorites = document.getElementById("tabFavorites");
  const searchPanel = document.getElementById("search-panel");
  const tabFavoritesCountEl = document.getElementById("favorites-count");
  const favoritesPanel = document.getElementById("favorites-panel")

  const tabFlightNumber = document.getElementById("tabFlightNumber");
  const tabRoute = document.getElementById("tabRoute");
  const flightNumberSearch = document.getElementById("flightNumberSearch");
  const routeSearch = document.getElementById("routeSearch");

  const searchFlightBtn = document.getElementById("searchFlightBtn");
  const searchRouteBtn = document.getElementById("searchRouteBtn");

  const resultContainer = document.getElementById("results");
  const loader = document.getElementById("loader");
  const messageEl = document.getElementById("message");
  const filterSection = document.getElementById("filter-section");
  const statusFilter = document.getElementById("status-filter");
  
  updatefavoritesCount()
  if(favorites.length>0){
    favoritesPanel.innerHTML = '<p class="text-center text-gray-500"> Click the favorites tab to see saved flights </p>'
  }

  //event lisiners
  tabSearch.addEventListener("click", () => switchMainView("search"));
  tabFavorites.addEventListener("click", () => switchMainView("favorites"));

  tabFlightNumber.addEventListener("click", () => switchSearchTab("flight"));
  tabRoute.addEventListener("click", () => switchSearchTab("route"));

  searchFlightBtn.addEventListener("click", () => {
    const flightData = document.getElementById("flight_iata").value.trim();
    if (!flightData) {
      displayMessage("Please enter a flight IATA number.", "error");
      return;
    }
    fetchFlight({ flight_iata: flightData });
  });
  searchRouteBtn.addEventListener("click", () => {
    const depIata = document.getElementById("dep_iata").value.trim();
    const arrIata = document.getElementById("arr_iata").value.trim();
    if (!depIata || !arrIata) {
      displayMessage(
        "please enter the both departure and arrival IATA codes.",
        "error"
      );
      return;
    }

    fetchFlight({ dep_iata: depIata, arr_iata: arrIata });
  });

  statusFilter.addEventListener("change",renderResults)

  function switchMainView(view) {
  currentView = view;
  if (view === "search") {
    tabSearch.classList.add("active");
    tabFavorites.classList.remove("active");
    searchPanel.classList.remove("hidden");
    favoritesPanel.classList.add("hidden");
  } else {
    tabFavorites.classList.add("active");
    tabSearch.classList.remove("active");
    searchPanel.classList.add("hidden");
    favoritesPanel.classList.remove("hidden");
    fetchFavoritesFlights(); // ← This is the missing part
  }
}

  async function fetchFlight(params) {
    clearResults();
    const quryParams = new URLSearchParams({
      access_key: API_KEY,
      ...params,
    }).toString();

    try {
      const res = await fetch(`${API_URL}?${quryParams}`);
      if (!res.ok) throw new Error(`HTTP error! Status:${res.status}`);
      const data = await res.json();
      if (data.error)
        throw new Error(data.error.info || "An API error occured.");

      if (params.flight_iata && data.data && data.data.length > 0) {
        currentFetchFlights = [data.data[0]];
      } else {
        currentFetchFlights = data.data || [];
      }
      if (currentFetchFlights.length > 0) {
        renderResults();
        filterSection.classList.remove("hidden");
      } else {
        displayMessage("No flights found for your search criteria.", "info");
        filterSection.classList.add("hidden");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      displayMessage(`Error:${error.message}.`, "error");
    } finally {
      showLoader(false);
    }

    function showLoader(show) {
      loader.style.display = show ? "flex " : "none";
      if (show) messageEl.classList.add("hidden");
    }
  }

  function switchSearchTab(tab) {
    if (tab === "flight") {
      tabFlightNumber.classList.add("active");
      tabRoute.classList.remove("active");
      flightNumberSearch.classList.remove("hidden");
      routeSearch.classList.add("hidden");
    } else {
      tabRoute.classList.add("active");
      tabFlightNumber.classList.remove("active");
      routeSearch.classList.remove("hidden");
      flightNumberSearch.classList.add("hidden");
    }
  }

  function clearResults() {
    resultContainer.innerHTML = "";
  }

  function displayMessage(message, type = "info") {
    clearResults();
    const colorClass =
      type === "error" ? "text-red-500" : "text-gray-500 dark:text-gray-400";
    resultContainer.innerHTML = `
    <div id="message" class="text-center py-10"><p class="${colorClass}">${message}</p><div/div>`;
  }

  function renderResults() {
    const filterValue = statusFilter.value;
    let flightsToDisplay = currentFetchFlights;

    if (filterValue != "all") {
      flightsToDisplay = currentFetchFlights.filter((flight) => {
        if (filterValue === "delayed") {
          return (
            flight.flight_status === "delayed" ||
            (flight.departure && flight.departure.delay > 0) ||
            (flight.arrival.delay && flight.arrival > 0)
          );
        }
        return flight.flight_status === filterValue;
      });
    }

    if (flightsToDisplay.length > 0) {
      displayFlights(flightsToDisplay);
    } else if (currentFetchFlights.length > 0) {
      displayMessage("No flights match the current filter", "info");
    } else if (currentView === "search") {
      displayMessage("Enter flight details to begin your search", "info");
    }
  }

  function displayFlights(flights) {
    clearResults();
    if (flights.length === 0) {
      displayMessage("N0 flights to display", "info");
    }
    flights.forEach((flight) => {
      const flightCard = createFlightCard(flight);
      resultContainer.appendChild(flightCard);
    });
  }

  async function fetchFavoritesFlights() {
    if(favorites.flight === 0){
      displayMessage("You have no favorite flights yet. Use the heart icon to save a flight.", "info")
      return
    }
    showLoader(true)
    clearResults()

    const favoriteFlightData = []
    for(const iata of favorites){
      try {
        const res = await fetch(`${API_URL}?access_key=${API_KEY}&flight_iata`)
        if(!res.ok){
          console.error(`Failed to fetch favorite flight ${iata}`)
          continue
        }
        const data= await res.json()
        if(data & data.data && data.data.length > 0 ){
          favoriteFlightData.push(data.data[0])
        }
      } catch (error) {
        console.error('Error fetching favorite flight ${iata}:' ,error)
      }
    }
    if(favoriteFlightData.length>0){
      displayFlights(favoriteFlightData)
    }else{
      displayMessage("Could not retrive details for favorite flights. They may no longer be active", "info")
    }
    showLoader(false)
  }

  function createFlightCard(flight) {
    const flightCard = document.createElement("div");
    flightCard.className = "flight-card bg-white p-6 rounded-2xl shadow-md";
    const {
      departure,
      arrival,
      airline,
      flight: flightInfo,
      flight_status,
    } = flight;

    const flightIata = flightInfo.iata || flightInfo.number;
    const isFavorited = favorites.includes(flightIata);

    const status = flight_status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    const statusColor =
      {
        scheduled: "bg-blue-100 text-blue-800",
        "en-route": "bg-green-100 text-green-800",
        landed: "bg-purple-100 text-purple-800",
        cancelled: "bg-red-100 text-red-800",
        delayed: "bg-yellow-100 text-yellow-800",
      }[flight_status] || "bg-gray-100 text-gray-800";

    const formatTime = (dateString) =>
      dateString
        ? new Date(dateString).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : "N/A";

    flightCard.innerHTML = `
    <div class="flex justify-between items-start mb-4  border-b border-gray-200 pb-4">
      <div>
        <p class="text-lg fo9nt-bold text-gray-800">${airline.name || "N/A"}</p>
        <p class="text-sm text-gray-500">Flight ${flightIata}</p>
      </div>
      <div class="flex items-center space-x-4">
        <span class="text-sm font-semibold px-3 py-1 rounded-full ${statusColor}">${status}</span>     
        <button class="heart-icon ${
          isFavorited ? "favorited" : ""
        }" data-iata ="${flightIata}">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M12 21s-6.713-5.77-9-9.279C1.13 7.86 2.781 4 7.246 4c1.989 0 3.383 1.218 4.002 2.051C11.372 5.218 12.766 4 14.755 4c4.465 0 6.116 3.86 4.246 7.721C18.713 15.23 12 21 12 21z"/>
          </svg>
        </button> 
      </div>
    </div>
    <div class="grid grid-cols-3 items-center text-center my-4">
      <div class="text-left">
        <p class="text-2xl font-bold">${departure.iata}</p>
        <p class="text-sm text-gray-600 truncate">${
          departure.airport || "N/A"
        }</p>
      </div>
      <div class="flex justify-center items-center text-gray-400">
  <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 rotate-270" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M2.5 19.5L21 12 2.5 4.5v5l13 2.5-13 2.5v5z" />
  </svg>
</div>

      <div class="text-right">
        <p class="text-2xl font-bold">${arrival.iata}</p>
        <p class="text-sm text-gray-600 truncate">${
          arrival.airport || "N/A"
        }</p>
      </div>
    </div>
    </div>
<div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t border-gray-200">
  <div class="space-y-2">
    <h4 class="font-semibold text-gray-700">Departure</h4>
    <p class="text-sm"><strong>Time:</strong> ${departure.scheduled || "N/A"} (Est: ${formatTime(departure.estimated)})</p>
    <p class="text-sm"><strong>Terminal/Gate:</strong> ${departure.terminal || "N/A"} / ${departure.gate || "N/A"}</p>
    <p class="text-sm"><strong>Delay:</strong> <span class="${departure.delay ? "text-red-500 font-semibold" : ""}">${departure.delay ? `${departure.delay}min` : "No Delay"}</span></p>
  </div>
  <div class="space-y-2">
    <h4 class="font-semibold text-gray-700">Arrival</h4>
    <p class="text-sm"><strong>Time:</strong> ${arrival.scheduled || "N/A"} (Est: ${formatTime(arrival.estimated)})</p>
    <p class="text-sm"><strong>Terminal/Gate:</strong> ${arrival.terminal || "N/A"} / ${arrival.gate || "N/A"}</p>
    <p class="text-sm"><strong>Delay:</strong> <span class="${arrival.delay ? "text-red-500 font-semibold" : ""}">${arrival.delay ? `${arrival.delay}min` : "No Delay"}</span></p>
  </div>
</div>

    `;

    const heartButton =flightCard.querySelector(".heart-icon")
    heartButton.addEventListener("click", (e)=>{
      e.stopPropagation()
      toggleFavorite(flightIata,heartButton)
    })
    return flightCard;
  }
  function toggleFavorite(flightIata,button){
    const index = favorites.indexOf(flightIata)
    const wasUnFavorited = index > -1


    if(wasUnFavorited){
      favorites.splice(index,1)
      button.classList.remove("favorited")
    }else{
      favorites.push(flightIata)
      button.classList.add("favorited")
    }
    localStorage.setItem("flightFavorites", JSON.stringify(favorites))
    updatefavoritesCount()
    if(currentView === "favorites" && wasUnFavorited){
      fetchFavoritesFlights()
    }
  }

  function updatefavoritesCount(){
    tabFavoritesCountEl.textContent =favorites.length
  }

});
