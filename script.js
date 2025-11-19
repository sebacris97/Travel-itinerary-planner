document.addEventListener('DOMContentLoaded', () => {

    // --- Selectors ---
    const destinationList = document.getElementById('destination-list');
    const addBtn = document.getElementById('add-destination-btn');
    const startDateInput = document.getElementById('startDate');
    const totalDaysInput = document.getElementById('totalDays');
    
    // Summary & Currency
    const summaryTotal = document.getElementById('summary-total');
    const summaryPlanned = document.getElementById('summary-planned');
    const summaryRemaining = document.getElementById('summary-remaining');
    const summaryRemainingBox = document.getElementById('summary-remaining-box');
    const totalAccommodationSpan = document.getElementById('total-accommodation');
    const totalTransportSpan = document.getElementById('total-transport');
    const totalGlobalSpan = document.getElementById('total-global');
    // New currency selectors
    const currencySelector = document.getElementById('currency-selector');
    const accCurrencySymbol = document.getElementById('acc-currency-symbol');
    const transCurrencySymbol = document.getElementById('trans-currency-symbol');
    const globalCurrencySymbol = document.getElementById('global-currency-symbol');

    // Footer Buttons
    const bulkAddTextarea = document.getElementById('bulk-add');
    const bulkAddBtn = document.getElementById('bulk-add-btn');
    const autofillBtn = document.getElementById('autofill-days-btn');
    const resetBtn = document.getElementById('reset-btn');
    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');
    const loadInput = document.getElementById('load-input');
    const copyUrlBtn = document.getElementById('copy-url-btn');
    const exportIcsBtn = document.getElementById('export-ics-btn');

    // --- STATE & INTERNATIONALIZATION (i18n) ---
    let destinations = [];
    let startDate = new Date().toISOString().split('T')[0];
    let totalDays = 14;
    let currencyCode = 'USD'; // Default currency
    let currencySymbol = '$';

    // Get the user's default locale for automatic number/date formatting
    const userLocale = navigator.language || 'en-US';

    // Simple dictionary for dynamic strings
    const i18n = {
        'en-US': {
            'info_incomplete_data': 'Origin and destination are needed to search for flights.',
            'info_enter_city_name': 'Enter a city name.',
            'modal_info': 'Info',
            'modal_error': 'Error',
            'modal_confirm_reset': 'Confirm Reset',
            'modal_delete_everything': 'Delete everything?',
            'modal_empty_itinerary': 'Empty itinerary.',
            'modal_invalid_json': 'Invalid JSON',
            'btn_copied': 'Copied!',
            'ics_no_destinations': 'No destinations.',
            'ics_stay': 'Stay',
            'ics_hotel': 'Hotel',
            'ics_transport': 'Transport',
            'ics_trip_to': 'Trip to',
            'bus_code_error': 'The search platform requires internal codes for cities. Please enter details manually.',
            'info_flight_number': 'Flight number and date are required to track flight.',
            'info_flight_number_format': 'Flight number format: AA1234 (Airline Code + Number)',
        },
        // Fallback for languages not explicitly defined
        get: (key) => i18n['en-US'][key] || key
    };
    
    // --- UTILITIES ---
    const DateUtils = {
        parse: (dateStr) => new Date(dateStr + 'T00:00:00Z'),
        formatISO: (date) => date.toISOString().split('T')[0], 
        addDays: (dateStr, days) => {
            const date = DateUtils.parse(dateStr);
            date.setUTCDate(date.getUTCDate() + days);
            return DateUtils.formatISO(date);
        },
        // Use user's locale for date formatting
        formatLocale: (dateStr) => {
            if (!dateStr) return '';
            const date = DateUtils.parse(dateStr);
            return date.toLocaleDateString(userLocale, { timeZone: 'UTC' });
        },
        formatICS: (dateStr) => dateStr.replace(/-/g, ''),
        formatSkyscanner: (dateStr) => {
            const [year, month, day] = dateStr.split('-');
            return `${year.slice(2)}${month}${day}`; 
        },
        // NEW: Get Date Components
        getComponents: (dateStr) => {
             const [year, month, day] = dateStr.split('-');
             return { year, month, day };
        }
    };

    function formatCost(cost) {
        if (!cost || isNaN(cost)) return '0';
        // Use Intl.NumberFormat and userLocale for number localization
        return parseFloat(cost).toLocaleString(userLocale, {
             minimumFractionDigits: 0,
             maximumFractionDigits: 0
        });
    }

    // --- EXTERNAL SERVICES ---
    
    function handleFlightSearch(originName, destName, dateStr) {
        if (!originName || !destName) {
            showModal(i18n.get("info_incomplete_data"), null, i18n.get("modal_info"));
            return;
        }
        
        // CORRECTION: Use the standard Google Flights URL.
        const query = `from ${originName} to ${destName} on ${dateStr} one way`;
        // NOTE: The original URL template was malformed/incomplete. Using a correct one for the intended service.
        const url = `https://www.google.com/travel/flights/search?q=${encodeURIComponent(query)}`;
        
        window.open(url, '_blank');
    }

    // FIX: Function for Bus Search (Rome2Rio)
    function handleBusSearch(originName, destName, dateStr) {
        if (!originName || !destName || !dateStr) {
            showModal("Origin, destination, and date are required to search for buses.", null, i18n.get("modal_info"));
            return;
        }

        // Rome2Rio URL format for Buses
        const rome2rioUrl = `https://www.rome2rio.com/map/${encodeURIComponent(originName)}/${encodeURIComponent(destName)}?departureDate=${dateStr}#r/Bus/s/0`;
        
        window.open(rome2rioUrl, '_blank');
    }

    // NEW: Function for Train Search (Rome2Rio)
    function handleTrainSearch(originName, destName, dateStr) {
        if (!originName || !destName || !dateStr) {
            showModal("Origin, destination, and date are required to search for trains.", null, i18n.get("modal_info"));
            return;
        }

        // Rome2Rio URL format for Trains
        const rome2rioUrl = `https://www.rome2rio.com/map/${encodeURIComponent(originName)}/${encodeURIComponent(destName)}?departureDate=${dateStr}#r/Train/s/0`;
        
        window.open(rome2rioUrl, '_blank');
    }

    // NEW: Function for FlightStats Search
    function handleFlightStatsSearch(flightNumber, dateStr) {
        if (!flightNumber || !dateStr) {
            showModal(i18n.get("info_flight_number"), null, i18n.get("modal_info"));
            return;
        }

        // Flight number is usually like AA1234
        const match = flightNumber.toUpperCase().match(/^([A-Z]{2,3})(\d+)$/);
        if (!match) {
            showModal(i18n.get("info_flight_number_format"), null, i18n.get("modal_error"));
            return;
        }
        
        const airlineCode = match[1];
        const flightNum = match[2];
        const { year, month, day } = DateUtils.getComponents(dateStr);

        // Construct the URL using the provided template
        const url = `https://www.flightstats.com/v2/flight-tracker/${airlineCode}/${flightNum}?year=${year}&month=${month}&date=${day}`;
        
        window.open(url, '_blank');
    }

    function handleHotelSearch(city, checkin, checkout) {
        if (!city) { showModal(i18n.get("info_enter_city_name"), null, i18n.get("modal_info")); return; }
        const url = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&checkin=${checkin}&checkout=${checkout}&group_adults=2&no_rooms=1&do_search=1`;
        window.open(url, '_blank');
    }
    
    // NEW: Function for Airbnb Search
    function handleAirbnbSearch(city, checkin, checkout) {
        if (!city) { showModal(i18n.get("info_enter_city_name"), null, i18n.get("modal_info")); return; }
        // Using a standard Airbnb search URL template based on user's example, setting adults to 2.
        const url = `https://www.airbnb.com/s/${encodeURIComponent(city)}/homes?checkin=${checkin}&checkout=${checkout}&adults=2`; 
        window.open(url, '_blank');
    }

    // --- URL ---
    function updateURL() {
        // Added currencyCode (c) to state
        const state = { s: startDate, t: totalDays, c: currencyCode, d: destinations }; 
        try {
            const jsonStr = JSON.stringify(state);
            let encoded;
            if (typeof LZString !== 'undefined') encoded = LZString.compressToEncodedURIComponent(jsonStr);
            else encoded = btoa(unescape(encodeURIComponent(jsonStr)));
            window.history.replaceState(null, '', `${window.location.pathname}?v2=${encoded}`);
        } catch (e) { console.error(e); }
    }

    function loadFromURL() {
        const params = new URLSearchParams(window.location.search);
        const v2 = params.get('v2');
        if (v2 && typeof LZString !== 'undefined') {
            try {
                const jsonStr = LZString.decompressFromEncodedURIComponent(v2);
                if (jsonStr) applyState(JSON.parse(jsonStr));
                return;
            } catch(e) {}
        }
        const plan = params.get('plan');
        if (plan) {
            try {
                const jsonStr = decodeURIComponent(escape(atob(plan)));
                applyState(JSON.parse(jsonStr));
            } catch (e) {}
        }
    }

    function applyState(state) {
        if (state.s || state.startDate) startDate = state.s || state.startDate;
        if (state.t || state.totalDays) totalDays = state.t || state.totalDays;
        
        // Load currency and update symbol
        if (state.c || state.currencyCode) { 
             currencyCode = state.c || state.currencyCode;
             // Must check if the option exists, as the list was reduced
             const selectedOption = currencySelector.querySelector(`option[value="${currencyCode}"]`);
             if(selectedOption) {
                 currencySymbol = selectedOption.dataset.symbol;
             } else {
                 // Fallback to USD if loaded currency is no longer an option 
                 currencyCode = 'USD';
                 currencySymbol = '$';
             }
        }

        if (state.d || state.destinations) destinations = state.d || state.destinations;
        startDateInput.value = startDate;
        totalDaysInput.value = totalDays;
        
        // Set selector value
        currencySelector.value = currencyCode;

        renderList();
    }

    // --- RENDERIZADO ---
    function createElement(tag, className, textContent = '') {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (textContent) el.textContent = textContent;
        return el;
    }

    function createDestinationCard(dest, index) {
        const itemWrapper = createElement('div', 'destination-item-wrapper');
        itemWrapper.dataset.id = dest.id;

        const card = createElement('div', 'destination-card p-4 bg-gray-800 rounded-xl shadow-lg transition-all duration-200 relative overflow-hidden mb-2');
        const row = createElement('div', 'flex flex-col md:flex-row gap-4 items-start md:items-center');
        
        const leftCol = createElement('div', 'flex items-center gap-3 flex-grow w-full md:w-auto');
        const dragHandle = createElement('button', 'drag-handle text-gray-500 hover:text-white p-2 cursor-move');
        dragHandle.innerHTML = '<span data-lucide="grip-vertical" class="w-6 h-6"></span>';
        
        const infoCol = createElement('div', 'flex-grow w-full');
        const nameInput = createElement('input', 'city-name text-xl font-bold bg-transparent border-none p-1 -m-1 rounded-md focus:bg-gray-700 focus:ring-1 focus:ring-blue-500 w-full placeholder-gray-500');
        nameInput.value = dest.name;
        nameInput.dataset.id = dest.id;
        nameInput.dataset.action = 'edit-name';
        nameInput.placeholder = "City Name";

        const datesDisplay = createElement('div', 'date-display text-sm text-gray-400 mt-1 flex items-center gap-2');
        infoCol.append(nameInput, datesDisplay);
        leftCol.append(dragHandle, infoCol);

        const rightCol = createElement('div', 'flex items-center gap-3 w-full md:w-auto justify-between md:justify-end bg-gray-900/50 p-2 rounded-lg border border-gray-700/50');
        
        // --- Accommodation Search Buttons ---
        const searchBtnsWrapper = createElement('div', 'flex gap-2');

        const bookingBtn = createElement('button', 'bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors shadow-sm');
        bookingBtn.dataset.action = 'search-hotel';
        bookingBtn.title = "Search on Booking.com";
        bookingBtn.innerHTML = '<span data-lucide="bed-double" class="w-4 h-4"></span><span class="hidden sm:inline font-medium">Booking</span>';
        
        // NEW: Airbnb button
        const airbnbBtn = createElement('button', 'bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors shadow-sm');
        airbnbBtn.dataset.action = 'search-airbnb';
        airbnbBtn.title = "Search on Airbnb";
        airbnbBtn.innerHTML = '<span data-lucide="house" class="w-4 h-4"></span><span class="hidden sm:inline font-medium">Airbnb</span>';
        
        searchBtnsWrapper.append(bookingBtn, airbnbBtn);
        // --- End Search Buttons ---

        const accWrapper = createElement('div', 'relative group');
        accWrapper.title = "Accommodation Cost";
        // FIX: Add translate="no" to the currency symbol span
        accWrapper.innerHTML = `<span class="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" translate="no">${currencySymbol}</span>`; 
        const accInput = createElement('input', 'accommodation-cost-input w-20 bg-gray-800 text-white text-sm rounded border border-gray-600 p-2 pl-5 focus:ring-indigo-500 focus:outline-none');
        accInput.type = "number";
        // FIX: Add translate="no" to the input itself (affects placeholder/value in translation)
        accInput.setAttribute('translate', 'no');
        accInput.placeholder = "0";
        accInput.min = "0";
        accInput.value = dest.accommodationCost || '';
        accInput.dataset.id = dest.id;
        accInput.dataset.action = 'edit-acc-cost';
        accWrapper.appendChild(accInput);

        const daysWrapper = createElement('div', 'flex flex-col items-center');
        daysWrapper.innerHTML = '<label class="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Days</label>';
        const daysInput = createElement('input', 'days-input w-16 p-1 text-center text-base font-bold bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500');
        daysInput.type = "number";
        daysInput.min = "1";
        daysInput.value = dest.days;
        daysInput.dataset.id = dest.id;
        daysInput.dataset.action = 'edit-days';
        daysWrapper.appendChild(daysInput);

        const deleteBtn = createElement('button', 'delete-btn text-gray-500 hover:text-red-400 hover:bg-red-900/30 p-2 rounded transition-colors ml-1');
        deleteBtn.title = "Delete";
        deleteBtn.innerHTML = '<span data-lucide="trash-2" class="w-4 h-4"></span>';
        deleteBtn.dataset.id = dest.id;
        deleteBtn.dataset.action = 'delete';

        // Updated rightCol append to include the search buttons wrapper
        rightCol.append(searchBtnsWrapper, accWrapper, daysWrapper, deleteBtn);
        row.append(leftCol, rightCol);
        card.appendChild(row);
        itemWrapper.appendChild(card);

        if (index < destinations.length - 1) {
            const connector = createElement('div', 'transport-connector flex items-center justify-center relative gap-2 my-2 flex-col'); // Add flex-col for stacking
            connector.innerHTML = `<div class="border-l-2 border-dashed border-gray-600 h-16 absolute top-0" style="left: 50%; transform: translateX(-50%); z-index: 0;"></div>`;
            
            // NOTE: Adjusted classes for controls to be flex-col and have a width
            const controls = createElement('div', 'z-10 flex flex-col gap-2 bg-gray-900 p-2 rounded-lg border border-gray-700 shadow-xl w-64'); 
            
            // MAIN CONTROL ROW (Select, Cost, Search Buttons)
            const mainControls = createElement('div', 'flex items-center gap-2 w-full');
            
            const select = createElement('select', 'transport-select bg-gray-800 text-white text-xs rounded border border-gray-600 p-1.5 focus:ring-blue-500 focus:outline-none flex-grow');
            select.dataset.id = dest.id;
            select.dataset.action = 'edit-transport';
            ['plane|✈️ Plane', 'train|🚈 Train', 'bus|🚌 Bus', 'car|🚗 Car'].forEach(opt => {
                const [val, label] = opt.split('|');
                const option = new Option(label, val);
                if(dest.transport === val) option.selected = true;
                select.appendChild(option);
            });

            const costWrapper = createElement('div', 'relative flex-shrink-0');
            // FIX: Add translate="no" to the currency symbol span
            costWrapper.innerHTML = `<span class="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" translate="no">${currencySymbol}</span>`;
            const costInput = createElement('input', 'cost-input w-20 bg-gray-800 text-white text-xs rounded border border-gray-600 p-1.5 pl-5 focus:ring-blue-500 focus:outline-none');
            costInput.type = "number";
            // FIX: Add translate="no" to the input itself
            costInput.setAttribute('translate', 'no');
            costInput.placeholder = "Cost";
            costInput.min = "0";
            costInput.value = dest.transportCost || '';
            costInput.dataset.id = dest.id;
            costInput.dataset.action = 'edit-trans-cost';
            costWrapper.appendChild(costInput);

            mainControls.append(select, costWrapper);
            
            // Conditional search buttons
            if (dest.transport === 'plane') {
                const flightBtn = createElement('button', 'bg-sky-600 hover:bg-sky-500 text-white p-1.5 rounded shadow transition-colors flex-shrink-0');
                flightBtn.dataset.action = 'search-flight';
                flightBtn.title = "Search flights";
                flightBtn.innerHTML = '<span data-lucide="search" class="w-3 h-3"></span>';
                mainControls.appendChild(flightBtn);
            }
            if (dest.transport === 'bus') {
                const busBtn = createElement('button', 'bg-green-600 hover:bg-green-500 text-white p-1.5 rounded shadow transition-colors flex-shrink-0');
                busBtn.dataset.action = 'search-bus'; 
                busBtn.title = "Search route (Rome2Rio)";
                busBtn.innerHTML = '<span data-lucide="bus" class="w-3 h-3"></span>';
                mainControls.appendChild(busBtn);
            }
            if (dest.transport === 'train') {
                const trainBtn = createElement('button', 'bg-red-600 hover:bg-red-500 text-white p-1.5 rounded shadow transition-colors flex-shrink-0');
                trainBtn.dataset.action = 'search-train'; 
                trainBtn.title = "Search route (Rome2Rio)";
                trainBtn.innerHTML = '<span data-lucide="train" class="w-3 h-3"></span>'; 
                mainControls.appendChild(trainBtn);
            }

            // APPEND MAIN CONTROLS TO THE CONTAINER
            controls.appendChild(mainControls);
            
            // NEW DETAIL INPUTS SECTION
            
            // Helper function to create an input element with dataset properties
            const createDetailInput = (action, type, placeholder, value, icon, extraClass = '') => {
                const wrapper = createElement('div', `flex-1 relative ${extraClass}`);
                wrapper.title = placeholder;
                const iconSpan = createElement('span', 'absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500');
                iconSpan.innerHTML = `<span data-lucide="${icon}" class="w-3 h-3"></span>`;
                
                const input = createElement('input', 'transport-detail-input w-full bg-gray-800 text-white text-xs rounded border border-gray-600 p-1.5 pl-6 focus:ring-blue-500 focus:outline-none');
                input.type = type;
                input.placeholder = placeholder;
                input.value = value || '';
                input.dataset.id = dest.id;
                input.dataset.action = action;
                if(type === 'time' || action === 'edit-flight-num') input.setAttribute('translate', 'no');
                
                wrapper.append(iconSpan, input);
                return wrapper;
            };

            const timeRefRow = createElement('div', 'flex gap-2 w-full');
            timeRefRow.append(
                createDetailInput('edit-dep-time', 'time', 'Depart', dest.departureTime, 'clock'),
                createDetailInput('edit-arr-time', 'time', 'Arrive', dest.arrivalTime, 'clock-3')
            );
            
            // NEW: Flight Number Input
            const flightNumInputWrapper = createDetailInput('edit-flight-num', 'text', 'Flight Number (IB2601)', dest.flightNumber, 'plane'); 
            
            // NEW: FlightStats Button
            const flightStatsBtn = createElement('button', 'bg-gray-600 hover:bg-gray-500 text-white p-1.5 rounded shadow transition-colors flex-shrink-0'); 
            flightStatsBtn.dataset.action = 'search-flightstats'; 
            flightStatsBtn.title = "Track Flight (FlightStats)"; 
            flightStatsBtn.innerHTML = '<span data-lucide="compass" class="w-3 h-3"></span>'; 

            // NEW: Conditional rendering for flight details
            if (dest.transport === 'plane') {
                const flightDetailRow = createElement('div', 'flex gap-2 w-full items-center');
                flightDetailRow.append(flightNumInputWrapper, flightStatsBtn);
                controls.append(timeRefRow, flightDetailRow);
            } else {
                controls.append(timeRefRow);
            }
            
            connector.appendChild(controls);
            itemWrapper.appendChild(connector);
        }

        return itemWrapper;
    }

    function renderList() {
        destinationList.innerHTML = '';
        if (destinations.length === 0) {
            destinationList.innerHTML = `<div class="text-center p-10 border-2 border-dashed border-gray-700 rounded-lg"><p class="text-gray-400">Your itinerary is empty.</p></div>`;
        } else {
            const fragment = document.createDocumentFragment();
            destinations.forEach((dest, index) => fragment.appendChild(createDestinationCard(dest, index)));
            destinationList.appendChild(fragment);
            lucide.createIcons();
        }
        updateCalculations();
    }

    function updateCalculations() {
        let currentStartDate = startDate;
        let totalPlannedDays = 0;
        let totalAccCost = 0;
        let totalTransCost = 0;

        const items = Array.from(destinationList.querySelectorAll('.destination-item-wrapper'));

        items.forEach((item, index) => {
            const destId = item.dataset.id;
            const dest = destinations.find(d => d.id === destId);
            if (!dest) return;

            totalPlannedDays += dest.days;
            totalAccCost += parseFloat(dest.accommodationCost) || 0;
            totalTransCost += parseFloat(dest.transportCost) || 0;

            const endDate = DateUtils.addDays(currentStartDate, dest.days);
            
            const dateDisplay = item.querySelector('.date-display');
            // Using user's locale for date format
            if (dateDisplay) dateDisplay.textContent = `${DateUtils.formatLocale(currentStartDate)} → ${DateUtils.formatLocale(endDate)}`;

            const bookingBtn = item.querySelector('[data-action="search-hotel"]');
            const airbnbBtn = item.querySelector('[data-action="search-airbnb"]'); // Select the new Airbnb button
            
            if (bookingBtn) {
                bookingBtn.dataset.name = dest.name;
                bookingBtn.dataset.start = currentStartDate; 
                bookingBtn.dataset.end = endDate; 
            }
            
            // NEW: Assign data to Airbnb button
            if (airbnbBtn) {
                airbnbBtn.dataset.name = dest.name;
                airbnbBtn.dataset.start = currentStartDate; 
                airbnbBtn.dataset.end = endDate; 
            }

            const flightBtn = item.querySelector('[data-action="search-flight"]');
            const busBtn = item.querySelector('[data-action="search-bus"]'); 
            const trainBtn = item.querySelector('[data-action="search-train"]'); 
            const flightStatsBtn = item.querySelector('[data-action="search-flightstats"]'); 

            
            // Asignar los datos de Origen/Destino/Fecha al botón de búsqueda
            if ((flightBtn || busBtn || trainBtn || flightStatsBtn) && index < destinations.length - 1) { 
                const nextDest = destinations[index + 1];
                
                if (flightBtn) {
                    flightBtn.dataset.origin = dest.name;
                    flightBtn.dataset.dest = nextDest.name;
                    flightBtn.dataset.date = endDate;
                }
                
                // ASIGNACIÓN DE DATOS AL BOTÓN DE BUS
                if (busBtn) {
                    busBtn.dataset.origin = dest.name;
                    busBtn.dataset.dest = nextDest.name;
                    busBtn.dataset.date = endDate;
                }
                
                // ASIGNACIÓN DE DATOS AL BOTÓN DE TRAIN
                if (trainBtn) {
                    trainBtn.dataset.origin = dest.name;
                    trainBtn.dataset.dest = nextDest.name;
                    trainBtn.dataset.date = endDate;
                }
                
                // NEW: ASSIGN DATA TO FLIGHTSTATS BUTTON
                if (flightStatsBtn) {
                     flightStatsBtn.dataset.fltnum = dest.flightNumber; 
                     flightStatsBtn.dataset.date = endDate; 
                }
            }


            currentStartDate = endDate;
        });

        const remaining = totalDays - totalPlannedDays;
        summaryTotal.textContent = totalDays;
        summaryPlanned.textContent = totalPlannedDays;
        summaryRemaining.textContent = remaining;

        summaryRemainingBox.className = 'text-center p-3 rounded-xl border transition-colors duration-300';
        if (remaining < 0) summaryRemainingBox.classList.add('bg-red-900/50', 'border-red-700');
        else if (remaining === 0) summaryRemainingBox.classList.add('bg-green-900/50', 'border-green-700');
        else summaryRemainingBox.classList.add('bg-gray-700', 'border-gray-600');

        // Update currency symbols
        accCurrencySymbol.textContent = currencySymbol;
        transCurrencySymbol.textContent = currencySymbol;
        globalCurrencySymbol.textContent = currencySymbol;
        
        // Use localized number formatting
        totalAccommodationSpan.textContent = formatCost(totalAccCost);
        totalTransportSpan.textContent = formatCost(totalTransCost);
        totalGlobalSpan.textContent = formatCost(totalAccCost + totalTransCost);

        updateURL();
    }

    // --- LISTENERS ---
    destinationList.addEventListener('input', (e) => {
        const target = e.target;
        const action = target.dataset.action;
        const id = target.dataset.id;
        if (!action || !id) return;
        const dest = destinations.find(d => d.id === id);
        if (!dest) return;

        if (action === 'edit-name') { dest.name = target.value; updateURL(); }
        if (action === 'edit-days') { dest.days = parseInt(target.value) || 1; updateCalculations(); }
        if (action === 'edit-acc-cost') { dest.accommodationCost = target.value; updateCalculations(); }
        if (action === 'edit-trans-cost') { dest.transportCost = target.value; updateCalculations(); }
        // NEW: Detailed Transport Listeners (only require URL update)
        if (action === 'edit-dep-time') { dest.departureTime = target.value; updateURL(); }
        if (action === 'edit-arr-time') { dest.arrivalTime = target.value; updateURL(); }
        if (action === 'edit-flight-num') { dest.flightNumber = target.value; updateCalculations(); } 
    });

    destinationList.addEventListener('change', (e) => {
        if (e.target.dataset.action === 'edit-transport') {
            const dest = destinations.find(d => d.id === e.target.dataset.id);
            if (dest) { 
                dest.transport = e.target.value; 
                renderList(); 
            }
        }
    });

    destinationList.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const action = btn.dataset.action;
        
        if (action === 'delete') {
            destinations = destinations.filter(d => d.id !== btn.dataset.id);
            renderList();
        }
        if (action === 'search-hotel') {
            handleHotelSearch(btn.dataset.name, btn.dataset.start, btn.dataset.end);
        }
        // NEW: Airbnb search listener
        if (action === 'search-airbnb') {
             handleAirbnbSearch(btn.dataset.name, btn.dataset.start, btn.dataset.end);
        }
        if (action === 'search-flight') {
            handleFlightSearch(btn.dataset.origin, btn.dataset.dest, btn.dataset.date);
        }
        if (action === 'search-bus') {
            handleBusSearch(btn.dataset.origin, btn.dataset.dest, btn.dataset.date); 
        }
        // NEW: Train Search Listener
        if (action === 'search-train') {
            handleTrainSearch(btn.dataset.origin, btn.dataset.dest, btn.dataset.date); 
        }
        // NEW: FlightStats Listener
        if (action === 'search-flightstats') {
             handleFlightStatsSearch(btn.dataset.fltnum, btn.dataset.date); 
        }
    });
    
    // Currency Selector Listener
    currencySelector.addEventListener('change', (e) => {
        currencyCode = e.target.value;
        const selectedOption = e.target.querySelector(`option[value="${currencyCode}"]`);
        currencySymbol = selectedOption ? selectedOption.dataset.symbol : '$';
        renderList(); // Re-render list to update currency symbols in inputs
    });

    // --- GLOBAL FUNCTIONALITY (Security Fix Applied) ---
    function showModal(message, onConfirm, title = i18n.get("modal_info")) {
        const existingModal = document.getElementById('custom-modal');
        if (existingModal) existingModal.remove();
        const modal = document.createElement('div');
        modal.id = 'custom-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
        
        // Safe modal construction without innerHTML for the message
        const container = document.createElement('div');
        container.className = 'bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm';
        
        const h3 = document.createElement('h3');
        h3.className = 'text-xl font-bold mb-4';
        h3.textContent = title;
        
        const p = document.createElement('p');
        p.className = 'text-gray-300 mb-6';
        p.textContent = message; // <-- Using textContent avoids XSS

        const btnContainer = document.createElement('div');
        btnContainer.className = 'flex justify-end gap-3';

        if (onConfirm) {
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.onclick = () => modal.remove();
            btnContainer.appendChild(cancelBtn);
        }

        const okBtn = document.createElement('button');
        okBtn.className = 'px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg';
        okBtn.textContent = onConfirm ? 'OK' : 'Close';
        okBtn.onclick = () => { if (onConfirm) onConfirm(); modal.remove(); };
        btnContainer.appendChild(okBtn);

        container.append(h3, p, btnContainer);
        modal.appendChild(container);
        document.body.appendChild(modal);
    }

    function exportToICS() {
        if (destinations.length === 0) return showModal(i18n.get("ics_no_destinations"), null, i18n.get("modal_info"));
        let ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TripPlan//EN", "CALSCALE:GREGORIAN"];
        let curr = startDate;
        destinations.forEach((dest, idx) => {
            const start = DateUtils.formatICS(curr);
            const next = DateUtils.addDays(curr, dest.days);
            const end = DateUtils.formatICS(next);
            // Use i18n for description text and dynamic currency symbol/formatted cost
            let desc = `${i18n.get("ics_stay")}: ${dest.days} days.`;
            if (dest.accommodationCost) desc += `\\n${i18n.get("ics_hotel")}: ${currencySymbol}${formatCost(dest.accommodationCost)}`;
            
            if (idx < destinations.length - 1) {
                if (dest.transportCost) desc += `\\n${i18n.get("ics_transport")}: ${dest.transport} (${currencySymbol}${formatCost(dest.transportCost)})`;
                
                // NEW: Add detailed transport info
                if (dest.departureTime) desc += `\\nDeparture Time: ${dest.departureTime}`;
                if (dest.arrivalTime) desc += `\\nArrival Time: ${dest.arrivalTime}`;
                if (dest.flightNumber) desc += `\\nFlight No: ${dest.flightNumber}`;
            }

            ics.push("BEGIN:VEVENT", `DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${end}`, `SUMMARY:${i18n.get("ics_trip_to")} ${dest.name}`, `DESCRIPTION:${desc}`, "END:VEVENT");
            curr = next;
        });
        ics.push("END:VCALENDAR");
        const blob = new Blob([ics.join("\r\n")], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = 'itinerary.ics';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }

    function generateId() { return crypto.randomUUID(); }
    
    // MODIFIED: Add new fields to the initial destination object
    function addDestination(name = "New City") {
        destinations.push({ 
            id: generateId(), 
            name: name, 
            days: 1, 
            accommodationCost: "", 
            transport: "plane", 
            transportCost: "",
            departureTime: "", // NEW
            arrivalTime: "",   // NEW
            bookingRef: "",    // KEPT FOR STATE/STORAGE, but field is unused
            flightNumber: ""   // NEW: Flight Number
        });
        renderList();
    }

    // --- INIT ---
    function init() {
        addBtn.addEventListener('click', () => addDestination());
        startDateInput.addEventListener('change', (e) => { startDate = e.target.value; updateCalculations(); });
        totalDaysInput.addEventListener('change', (e) => { totalDays = parseInt(e.target.value, 10) || 1; updateCalculations(); });
        autofillBtn.addEventListener('click', () => {
            if (!destinations.length) return;
            const b = Math.floor(totalDays / destinations.length), r = totalDays % destinations.length;
            destinations.forEach((d, i) => d.days = b + (i < r ? 1 : 0));
            renderList();
        });
        
        // FIX: The keydown listener for Bulk Add (Enter key)
        bulkAddTextarea.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                bulkAddBtn.click(); // Trigger bulk add on Enter
            } 
        });
        
        // Now supports commas AND new lines
        bulkAddBtn.addEventListener('click', () => {
            if (bulkAddTextarea.value) { 
                bulkAddTextarea.value.split(/[\n,]/).forEach(n => { if(n.trim()) addDestination(n.trim()) }); 
                bulkAddTextarea.value=''; 
            }
        });

        resetBtn.addEventListener('click', () => showModal(i18n.get("modal_delete_everything"), () => { destinations=[]; startDate=new Date().toISOString().split('T')[0]; totalDays=14; startDateInput.value=startDate; totalDaysInput.value=totalDays; updateCalculations(); renderList(); }, i18n.get("modal_confirm_reset")));
        saveBtn.addEventListener('click', () => {
            if (!destinations.length) return showModal(i18n.get("modal_empty_itinerary"), null, i18n.get("modal_info"));
            // Include currencyCode in saved JSON
            const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({startDate, totalDays, currencyCode, destinations}, null, 2)], {type:'application/json'}));
            a.download=`trip-${startDate}.json`; a.click();
        });
        loadBtn.addEventListener('click', () => loadInput.click());
        
        // FIX: The load JSON input handler
        loadInput.addEventListener('change', (e) => {
            const f = e.target.files[0];
            if(f) { 
                const r=new FileReader(); 
                r.onload=(ev)=>{ 
                    try{ 
                        const d=JSON.parse(ev.target.result); 
                        // Validate if loaded data has main state fields
                        if (d && (d.destinations || d.d || d.s || d.t)) { 
                            applyState(d); 
                        } else {
                            showModal(i18n.get("modal_invalid_json"), null, i18n.get("modal_error"));
                        }
                    }catch(err){ 
                        showModal(i18n.get("modal_invalid_json"), null, i18n.get("modal_error")); 
                    } 
                }; 
                r.readAsText(f); 
            }
            e.target.value=null;
        });

        copyUrlBtn.addEventListener('click', () => { navigator.clipboard.writeText(window.location.href); const p=copyUrlBtn.innerHTML; copyUrlBtn.textContent=i18n.get("btn_copied"); setTimeout(()=>{copyUrlBtn.innerHTML=p;lucide.createIcons()},2000); });
        if(exportIcsBtn) exportIcsBtn.addEventListener('click', exportToICS);

        new Sortable(destinationList, { animation: 150, handle: '.drag-handle', ghostClass: 'dragging', onEnd: (evt) => { const [m]=destinations.splice(evt.oldIndex,1); destinations.splice(evt.newIndex,0,m); renderList(); } });

        // Initialization: Load state before rendering
        if (!startDateInput.value) startDateInput.value = startDate;
        totalDaysInput.value = totalDays;
        
        // Set currencySelector default value before loading from URL
        currencySelector.value = currencyCode; 

        // FIX: Ensure Lucide icons are rendered for static elements like the '+' button.
        lucide.createIcons();

        loadFromURL();
        if (!destinations.length) renderList(); // Initial render if no destinations loaded from URL
    }
    init();
});