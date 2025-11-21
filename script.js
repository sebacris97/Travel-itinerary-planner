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

    // Historial Selectors
    const saveHistoryBtn = document.getElementById('save-history-btn');
    const historySidebar = document.getElementById('history-sidebar');
    const historyList = document.getElementById('history-list');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    const toggleHistoryBtn = document.getElementById('toggle-history-btn');
    
    // Seed Selectors
    const copySeedBtn = document.getElementById('copy-seed-btn');
    const loadSeedBtn = document.getElementById('load-seed-btn');

    // --- STATE & INTERNATIONALIZATION (i18n) ---
    let destinations = [];
    let startDate = new Date().toISOString().split('T')[0];
    let totalDays = 14;
    let currencyCode = 'USD'; 
    let currencySymbol = '$';

    const userLocale = navigator.language || 'en-US';

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
        formatLocale: (dateStr) => {
            if (!dateStr) return '';
            const date = DateUtils.parse(dateStr);
            return date.toLocaleDateString(userLocale, { timeZone: 'UTC' });
        },
        formatICS: (dateStr) => dateStr.replace(/-/g, ''),
        getComponents: (dateStr) => {
             const [year, month, day] = dateStr.split('-');
             return { year, month, day };
        }
    };

    function formatCost(cost) {
        if (!cost || isNaN(cost)) return '0';
        return parseFloat(cost).toLocaleString(userLocale, {
             minimumFractionDigits: 0,
             maximumFractionDigits: 2
        });
    }

    // --- HISTORIAL Y GUARDADO ---
    let tripHistory = JSON.parse(localStorage.getItem('trip_history') || '[]');
    let activeTripId = localStorage.getItem('active_trip_id');

    function setActiveTrip(id) {
        activeTripId = id;
        if (id) {
            localStorage.setItem('active_trip_id', id);
        } else {
            localStorage.removeItem('active_trip_id');
        }
    }

    function saveToHistory() {
        const existingTrip = activeTripId ? tripHistory.find(t => t.id === activeTripId) : null;

        if (existingTrip) {
            showSaveOptionsModal(
                existingTrip.name,
                () => { // Overwrite
                    updateURL(); 
                    existingTrip.url = window.location.href;
                    existingTrip.date = new Date().toISOString();
                    tripHistory = tripHistory.filter(t => t.id !== activeTripId);
                    tripHistory.unshift(existingTrip);
                    localStorage.setItem('trip_history', JSON.stringify(tripHistory));
                    renderHistory();
                    openSidebar();
                },
                () => { // Save New
                    promptNewSave();
                }
            );
        } else {
            promptNewSave();
        }
    }

    function promptNewSave() {
        showPromptModal(
            "Save New Trip", 
            "Enter a name for this trip:", 
            `Trip ${new Date().toLocaleDateString()}`, 
            (name) => {
                if (!name) return;
                updateURL();
                const newId = generateId(); 
                const newTrip = {
                    id: newId,
                    name: name.trim(),
                    url: window.location.href,
                    date: new Date().toISOString()
                };
                tripHistory.unshift(newTrip);
                localStorage.setItem('trip_history', JSON.stringify(tripHistory));
                setActiveTrip(newId);
                renderHistory();
                openSidebar();
            }
        );
    }

    function renameTrip(e, id) {
        const trip = tripHistory.find(t => t.id === id);
        if (!trip) return;

        showPromptModal(
            "Rename Trip", 
            "Enter new name:", 
            trip.name, 
            (newName) => {
                if (newName && newName.trim() !== "") {
                    trip.name = newName.trim();
                    localStorage.setItem('trip_history', JSON.stringify(tripHistory));
                    renderHistory();
                }
            }
        );
    }

    function deleteFromHistory(e, id) {
        showModal(
            "Are you sure you want to delete this trip from history?", 
            () => {
                tripHistory = tripHistory.filter(t => t.id !== id);
                localStorage.setItem('trip_history', JSON.stringify(tripHistory));
                if (activeTripId === id) {
                    setActiveTrip(null);
                }
                renderHistory();
            },
            "Delete Trip"
        );
    }

    function loadTripFromHistory(trip) {
        setActiveTrip(trip.id);
        window.location.href = trip.url;
    }

    // --- COPY / LOAD SEED ---
    
    function copyHistorySeed() {
        if (!tripHistory || tripHistory.length === 0) {
            return showModal("History is empty. Nothing to copy.", null, "Info");
        }
        try {
            const seed = LZString.compressToEncodedURIComponent(JSON.stringify(tripHistory));
            navigator.clipboard.writeText(seed).then(() => {
                const originalText = copySeedBtn.innerHTML;
                copySeedBtn.innerHTML = `<span data-lucide="check"></span> Copied!`;
                lucide.createIcons();
                setTimeout(() => {
                    copySeedBtn.innerHTML = originalText;
                    lucide.createIcons();
                }, 2000);
            });
        } catch (e) {
            showModal("Failed to create seed.", null, "Error");
        }
    }

    function loadHistorySeed() {
        showTextareaModal(
            "Load History Seed",
            "Paste your history seed here (this will replace current history):",
            (text) => {
                if (!text) return;
                try {
                    const data = LZString.decompressFromEncodedURIComponent(text.trim());
                    if (!data) throw new Error("Invalid seed");
                    
                    const importedHistory = JSON.parse(data);
                    
                    if (!Array.isArray(importedHistory)) throw new Error("Invalid format: Not an array");
                    
                    const validHistory = importedHistory.filter(t => t && t.id && t.name && t.url);
                    
                    if (validHistory.length === 0 && importedHistory.length > 0) {
                         throw new Error("Invalid format: No valid trips found");
                    }

                    tripHistory = validHistory;
                    localStorage.setItem('trip_history', JSON.stringify(tripHistory));
                    setActiveTrip(null);
                    renderHistory();
                    showModal("History loaded successfully!", null, "Success");
                } catch (e) {
                    showModal("Invalid or corrupted seed.", null, "Error");
                }
            }
        );
    }


    function renderHistory() {
        historyList.innerHTML = ''; 
        toggleHistoryBtn.classList.remove('hidden');
        historySidebar.classList.remove('hidden');

        if (tripHistory.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'flex flex-col items-center justify-center h-40 text-gray-500 text-center italic p-4 border-2 border-dashed border-gray-800 rounded-lg';
            emptyMsg.innerHTML = `
                <span data-lucide="history" class="w-8 h-8 mb-2 opacity-50"></span>
                <p class="text-xs">No history saved.</p>
            `;
            historyList.appendChild(emptyMsg);
            lucide.createIcons();
            return;
        }

        const template = document.getElementById('history-item-template');
        const fragment = document.createDocumentFragment(); 

        tripHistory.forEach(trip => {
            const clone = template.content.cloneNode(true);
            const itemDiv = clone.querySelector('.history-item');
            
            itemDiv.dataset.tripId = trip.id; 

            const isActive = trip.id === activeTripId;
            
            if (isActive) {
                itemDiv.classList.add('border-blue-500', 'bg-gray-800/80', 'ring-1', 'ring-blue-500');
                itemDiv.querySelector('.history-name').classList.add('text-blue-400');
            } else {
                itemDiv.classList.add('border-gray-700', 'bg-gray-800', 'hover:border-blue-400');
                itemDiv.querySelector('.history-name').classList.add('text-gray-300');
            }

            itemDiv.querySelector('.history-name').textContent = trip.name;
            itemDiv.querySelector('.history-name').title = trip.name;
            itemDiv.querySelector('.history-date').textContent = `Saved: ${new Date(trip.date).toLocaleDateString()}`;

            fragment.appendChild(clone);
        });
        
        historyList.appendChild(fragment);
        lucide.createIcons();
    }

    function openSidebar() {
        historySidebar.classList.remove('-translate-x-full');
        localStorage.setItem('history_sidebar_open', 'true');
    }

    function closeSidebar() {
        historySidebar.classList.add('-translate-x-full');
        localStorage.setItem('history_sidebar_open', 'false');
    }

    // --- MODALES ---
    function showModal(message, onConfirm, title = i18n.get("modal_info")) {
        const existingModal = document.getElementById('custom-modal');
        if (existingModal) existingModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'custom-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[70] p-4';
        
        const container = document.createElement('div');
        container.className = 'bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm border border-gray-700';
        
        const h3 = document.createElement('h3');
        h3.className = 'text-xl font-bold mb-4 text-white';
        h3.textContent = title;
        
        const p = document.createElement('p');
        p.className = 'text-gray-300 mb-6';
        p.textContent = message; 

        const btnContainer = document.createElement('div');
        btnContainer.className = 'flex justify-end gap-3';

        const closeModal = () => {
            document.removeEventListener('keydown', handleKey);
            modal.remove();
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors';
        cancelBtn.textContent = onConfirm ? 'Cancel' : 'Close';
        cancelBtn.onclick = closeModal;
        btnContainer.appendChild(cancelBtn);
        
        let okBtn;
        if (onConfirm) {
            okBtn = document.createElement('button');
            okBtn.className = 'px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium';
            okBtn.textContent = 'Confirm';
            okBtn.onclick = () => { onConfirm(); closeModal(); };
            btnContainer.appendChild(okBtn);
        }

        container.append(h3, p, btnContainer);
        modal.appendChild(container);
        document.body.appendChild(modal);

        const handleKey = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
            if (e.key === 'Enter') { e.preventDefault(); if (onConfirm) onConfirm(); closeModal(); }
        };
        document.addEventListener('keydown', handleKey);

        if(okBtn) okBtn.focus(); else cancelBtn.focus();
    }

    function showPromptModal(title, message, defaultValue, onConfirm) {
        const existingModal = document.getElementById('custom-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'custom-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[70] p-4';
        
        const container = document.createElement('div');
        container.className = 'bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm border border-gray-700';
        
        const h3 = document.createElement('h3');
        h3.className = 'text-xl font-bold mb-4 text-white';
        h3.textContent = title;
        
        const p = document.createElement('label');
        p.className = 'block text-gray-300 mb-2 text-sm';
        p.textContent = message; 

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'w-full p-2 mb-6 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none';
        input.value = defaultValue || '';

        const btnContainer = document.createElement('div');
        btnContainer.className = 'flex justify-end gap-3';

        const closeModal = () => {
            document.removeEventListener('keydown', handleKey);
            modal.remove();
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = closeModal;
        btnContainer.appendChild(cancelBtn);
        
        const okBtn = document.createElement('button');
        okBtn.className = 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors';
        okBtn.textContent = 'OK';
        
        const handleConfirm = () => {
            const val = input.value;
            onConfirm(val);
            closeModal();
        };

        okBtn.onclick = handleConfirm;
        btnContainer.appendChild(okBtn);
        container.append(h3, p, input, btnContainer);
        modal.appendChild(container);
        document.body.appendChild(modal);
        
        setTimeout(() => input.focus(), 50);

        const handleKey = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); }
            if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
        };
        document.addEventListener('keydown', handleKey);
    }

    function showTextareaModal(title, message, onConfirm) {
        const existingModal = document.getElementById('custom-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'custom-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[70] p-4';
        
        const container = document.createElement('div');
        container.className = 'bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-700';
        
        const h3 = document.createElement('h3');
        h3.className = 'text-xl font-bold mb-4 text-white';
        h3.textContent = title;
        
        const p = document.createElement('label');
        p.className = 'block text-gray-300 mb-2 text-sm';
        p.textContent = message; 

        const textarea = document.createElement('textarea');
        textarea.className = 'w-full p-2 mb-4 h-32 bg-gray-900 border border-gray-600 rounded-lg text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono';
        textarea.placeholder = "Paste seed here...";

        const btnContainer = document.createElement('div');
        btnContainer.className = 'flex justify-end gap-3';

        const closeModal = () => {
            document.removeEventListener('keydown', handleKey);
            modal.remove();
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = closeModal;
        
        const okBtn = document.createElement('button');
        okBtn.className = 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors';
        okBtn.textContent = 'Load';
        
        const handleConfirm = () => {
            onConfirm(textarea.value);
            closeModal();
        };

        okBtn.onclick = handleConfirm;
        btnContainer.append(cancelBtn, okBtn);
        container.append(h3, p, textarea, btnContainer);
        modal.appendChild(container);
        document.body.appendChild(modal);
        
        setTimeout(() => textarea.focus(), 50);

        const handleKey = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
        };
        document.addEventListener('keydown', handleKey);
    }

    function showSaveOptionsModal(currentName, onOverwrite, onSaveNew) {
        const existingModal = document.getElementById('custom-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'custom-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[70] p-4';
        
        const container = document.createElement('div');
        container.className = 'bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm border border-gray-700';
        
        const h3 = document.createElement('h3');
        h3.className = 'text-xl font-bold mb-4 text-white';
        h3.textContent = "Save Trip";
        
        const p = document.createElement('p');
        p.className = 'text-gray-300 mb-6 text-sm';
        p.innerHTML = `You are currently editing <b>${currentName}</b>.<br>Do you want to overwrite it or create a new copy?`; 

        const btnContainer = document.createElement('div');
        btnContainer.className = 'flex flex-col gap-2';

        const closeModal = () => { 
            document.removeEventListener('keydown', handleKey);
            modal.remove(); 
        };

        const overwriteBtn = document.createElement('button');
        overwriteBtn.className = 'w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2';
        overwriteBtn.innerHTML = '<span data-lucide="save"></span> Overwrite Existing';
        overwriteBtn.onclick = () => { onOverwrite(); closeModal(); };
        
        const newBtn = document.createElement('button');
        newBtn.className = 'w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2';
        newBtn.innerHTML = '<span data-lucide="copy-plus"></span> Save as New';
        newBtn.onclick = () => { onSaveNew(); closeModal(); };

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'w-full px-4 py-2 mt-2 text-gray-400 hover:text-white text-sm';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = closeModal;

        btnContainer.append(overwriteBtn, newBtn, cancelBtn);
        container.append(h3, p, btnContainer);
        modal.appendChild(container);
        document.body.appendChild(modal);
        lucide.createIcons();

        const handleKey = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); overwriteBtn.click(); }
            if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
        };
        document.addEventListener('keydown', handleKey);
        
        overwriteBtn.focus();
    }


    // --- AUTOCOMPLETE ---
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(null, args), delay);
        };
    };

    function closeAllSuggestions() {
        document.querySelectorAll('.autocomplete-suggestions').forEach(el => el.remove());
    }

    const handleCitySearch = debounce(async (input, id) => {
        const query = input.value.trim();
        if (query.length < 2) {
            closeAllSuggestions();
            return;
        }

        try {
            const lang = userLocale.split('-')[0] || 'en';
            const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=${lang}&format=json&origin=*`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.search && data.search.length > 0) {
                showSuggestions(input, data.search, id);
            } else {
                closeAllSuggestions();
            }
        } catch (error) {
            console.error("Wikidata API error:", error);
        }
    }, 300);

    function showSuggestions(input, results, id) {
        closeAllSuggestions();
        
        const container = document.createElement('div');
        container.className = 'autocomplete-suggestions absolute left-0 right-0 top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg z-50 max-h-60 overflow-y-auto shadow-2xl';
        
        results.forEach(item => {
            const div = document.createElement('div');
            div.className = 'autocomplete-suggestion p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0 transition-colors flex flex-col items-start';
            
            const labelDiv = document.createElement('div');
            labelDiv.className = 'font-bold text-sm text-white';
            labelDiv.textContent = item.label;

            div.appendChild(labelDiv);

            if (item.description) {
                const descDiv = document.createElement('div');
                descDiv.className = 'text-xs text-gray-400';
                descDiv.textContent = item.description;
                div.appendChild(descDiv);
            }
            
            div.addEventListener('click', (e) => {
                e.stopPropagation(); 
                input.value = item.label;
                
                const dest = destinations.find(d => d.id === id);
                if (dest) {
                    dest.name = item.label;
                    updateURL();
                    updateCalculations(); 
                }
                
                closeAllSuggestions();
            });
            container.appendChild(div);
        });

        if (getComputedStyle(input.parentNode).position === 'static') {
            input.parentNode.classList.add('relative');
        }
        
        input.parentNode.appendChild(container);
    }


	function handleFlightSearch(originName, destName, dateStr) {
        if (!originName || !destName) {
            showModal(i18n.get("info_incomplete_data"), null, i18n.get("modal_info"));
            return;
        }


        const query = `from ${originName} to ${destName} on ${dateStr} one way`;
        // CORRECCIÓN: Se usa la URL estándar de Google Flights y se agrega el parámetro de moneda (curr)
        // También se corrigió el error de sintaxis en la interpolación de la URL original
        const url = `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}&curr=${currencyCode}`;

        window.open(url, '_blank');
    }

    function handleBusSearch(originName, destName, dateStr) {
        if (!originName || !destName || !dateStr) {
            showModal("Origin, destination, and date are required to search for buses.", null, i18n.get("modal_info"));
            return;
        }
        const rome2rioUrl = `https://www.rome2rio.com/map/${encodeURIComponent(originName)}/${encodeURIComponent(destName)}?departureDate=${dateStr}#r/Bus/s/0`;
        window.open(rome2rioUrl, '_blank', 'noopener,noreferrer');
    }

    function handleTrainSearch(originName, destName, dateStr) {
        if (!originName || !destName || !dateStr) {
            showModal("Origin, destination, and date are required to search for trains.", null, i18n.get("modal_info"));
            return;
        }
        const rome2rioUrl = `https://www.rome2rio.com/map/${encodeURIComponent(originName)}/${encodeURIComponent(destName)}?departureDate=${dateStr}#r/Train/s/0`;
        window.open(rome2rioUrl, '_blank', 'noopener,noreferrer');
    }

    function handleFlightStatsSearch(flightNumber, dateStr) {
        if (!flightNumber || !dateStr) {
            showModal(i18n.get("info_flight_number"), null, i18n.get("modal_info"));
            return;
        }
        const match = flightNumber.toUpperCase().match(/^([A-Z]{2,3})(\d+)$/);
        if (!match) {
            showModal(i18n.get("info_flight_number_format"), null, i18n.get("modal_error"));
            return;
        }
        
        const airlineCode = match[1];
        const flightNum = match[2];
        const { year, month, day } = DateUtils.getComponents(dateStr);
        const url = `https://www.flightstats.com/v2/flight-tracker/${airlineCode}/${flightNum}?year=${year}&month=${month}&date=${day}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    function handleHotelSearch(city, checkin, checkout) {
        if (!city) { showModal(i18n.get("info_enter_city_name"), null, i18n.get("modal_info")); return; }
        const url = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&checkin=${checkin}&checkout=${checkout}&group_adults=2&no_rooms=1&do_search=1&selected_currency=${currencyCode}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    }
    
    function handleAirbnbSearch(city, checkin, checkout) {
        if (!city) { showModal(i18n.get("info_enter_city_name"), null, i18n.get("modal_info")); return; }
        const url = `https://www.airbnb.com/s/${encodeURIComponent(city)}/homes?checkin=${checkin}&checkout=${checkout}&adults=2&currency=${currencyCode}`; 
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    // --- URL & STATE ---
    function updateURL() {
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
        
        if (state.c || state.currencyCode) { 
             currencyCode = state.c || state.currencyCode;
             const selectedOption = currencySelector.querySelector(`option[value="${currencyCode}"]`);
             if(selectedOption) {
                 currencySymbol = selectedOption.dataset.symbol;
             } else {
                 currencyCode = 'USD';
                 currencySymbol = '$';
             }
        }

        if (state.d || state.destinations) destinations = state.d || state.destinations;
        startDateInput.value = startDate;
        totalDaysInput.value = totalDays;
        currencySelector.value = currencyCode;
        renderList();
    }

    // --- RENDERIZADO SEGURO ---
    
    function createDestinationCard(dest, index) {
        const template = document.getElementById('destination-template');
        const clone = template.content.cloneNode(true);
        const itemWrapper = clone.querySelector('.destination-item-wrapper');
        
        itemWrapper.dataset.id = dest.id;

        const nameInput = clone.querySelector('.city-name-input');
        nameInput.value = dest.name;
        nameInput.dataset.id = dest.id;
        nameInput.parentElement.classList.add('relative');

        const daysInput = clone.querySelector('.days-input');
        daysInput.value = dest.days;
        daysInput.dataset.id = dest.id;
        daysInput.min = "1";  // Validacion HTML: Mínimo 1
        daysInput.step = "1"; // Validacion HTML: Enteros

        const accInput = clone.querySelector('.acc-cost-input');
        accInput.value = dest.accommodationCost;
        accInput.dataset.id = dest.id;
        accInput.min = "0";   // Validacion HTML: Mínimo 0
        accInput.step = "0.01"; // Validacion HTML: Permite decimales
        
        const currencyLabel = clone.querySelector('.currency-symbol');
        currencyLabel.textContent = currencySymbol;

        const deleteBtn = clone.querySelector('.delete-btn');
        deleteBtn.dataset.id = dest.id;

        const connectorContainer = clone.querySelector('.transport-connector-container');
        if (index < destinations.length - 1) {
            const connector = createTransportConnector(dest);
            connectorContainer.appendChild(connector);
        } else {
            connectorContainer.remove();
        }

        return itemWrapper;
    }

    function createTransportConnector(dest) {
        const connector = document.createElement('div');
        connector.className = 'transport-connector flex items-center justify-center relative gap-2 my-2 flex-col';
        
        const verticalLine = document.createElement('div');
        verticalLine.className = 'border-l-2 border-dashed border-gray-600 h-16 absolute top-0';
        Object.assign(verticalLine.style, {
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: '0'
        });
        connector.appendChild(verticalLine);
        
        const controls = document.createElement('div');
        controls.className = 'z-10 flex flex-col gap-2 bg-gray-900 p-2 rounded-lg border border-gray-700 shadow-xl w-80';

        const mainControls = document.createElement('div');
        mainControls.className = 'flex items-center gap-2 w-full';

        const select = document.createElement('select');
        select.className = 'transport-select bg-gray-800 text-white text-xs rounded border border-gray-600 p-1.5 focus:ring-blue-500 focus:outline-none flex-grow';
        select.dataset.id = dest.id;
        select.dataset.action = 'edit-transport';
        select.setAttribute('aria-label', 'Transport Method');
        
        ['plane|✈️ Plane', 'train|🚈 Train', 'bus|🚌 Bus', 'car|🚗 Car'].forEach(opt => {
            const [val, label] = opt.split('|');
            const option = new Option(label, val);
            if(dest.transport === val) option.selected = true;
            select.appendChild(option);
        });

        const costWrapper = document.createElement('div');
        costWrapper.className = 'relative flex-shrink-0';
        
        const currencySpan = document.createElement('span');
        currencySpan.className = 'absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs';
        currencySpan.setAttribute('translate', 'no');
        currencySpan.textContent = currencySymbol;
        costWrapper.appendChild(currencySpan);
        
        const costInput = document.createElement('input');
        costInput.className = 'cost-input w-20 bg-gray-800 text-white text-xs rounded border border-gray-600 p-1.5 pl-5 focus:ring-blue-500 focus:outline-none';
        costInput.type = "number";
        costInput.placeholder = "Cost";
        costInput.min = "0";
        costInput.step = "0.01";
        costInput.value = dest.transportCost || '';
        costInput.dataset.id = dest.id;
        costInput.dataset.action = 'edit-trans-cost';
        costWrapper.appendChild(costInput);

        mainControls.append(select, costWrapper);

        let searchBtn = null;
        if (dest.transport === 'plane') {
            searchBtn = createIconButton('search-flight', 'search', 'Search flights', 'bg-sky-600 hover:bg-sky-500');
        } else if (dest.transport === 'bus') {
            searchBtn = createIconButton('search-bus', 'bus', 'Search route', 'bg-green-600 hover:bg-green-500');
        } else if (dest.transport === 'train') {
            searchBtn = createIconButton('search-train', 'train', 'Search route', 'bg-red-600 hover:bg-red-500');
        }
        if (searchBtn) mainControls.appendChild(searchBtn);

        controls.appendChild(mainControls);

        const timeRefRow = document.createElement('div');
        timeRefRow.className = 'flex gap-2 w-full';
        
        const createDetailInput = (action, type, placeholder, value, iconName) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'flex-1 relative';
            wrapper.title = placeholder;
            
            const iconContainer = document.createElement('span');
            iconContainer.className = 'absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500';
            
            const iconEl = document.createElement('span');
            iconEl.dataset.lucide = iconName;
            iconEl.className = 'w-3 h-3';
            
            iconContainer.appendChild(iconEl);
            wrapper.appendChild(iconContainer);
            
            const input = document.createElement('input');
            input.className = 'transport-detail-input w-full bg-gray-800 text-white text-xs rounded border border-gray-600 p-1.5 pl-6 focus:ring-blue-500 focus:outline-none';
            input.type = type;
            input.placeholder = placeholder;
            input.value = value || '';
            input.dataset.id = dest.id;
            input.dataset.action = action;
            if (type === 'time' || action === 'edit-flight-num') input.setAttribute('translate', 'no');
            
            wrapper.appendChild(input);
            return wrapper;
        };

        const offsetWrapper = document.createElement('div');
        offsetWrapper.className = 'relative w-16 flex-shrink-0';
        offsetWrapper.title = "+ Days";
        
        const plusSpan = document.createElement('span');
        plusSpan.className = 'absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs font-bold';
        plusSpan.textContent = '+';
        offsetWrapper.appendChild(plusSpan);

        const offsetInput = document.createElement('input');
        offsetInput.className = 'transport-detail-input w-full bg-gray-800 text-white text-xs rounded border border-gray-600 p-1.5 pl-5 focus:ring-blue-500 focus:outline-none';
        offsetInput.type = "number";
        offsetInput.min = "0";
        offsetInput.step = "1";
        offsetInput.value = dest.arrivalDayOffset > 0 ? dest.arrivalDayOffset : '';
        offsetInput.dataset.id = dest.id;
        offsetInput.dataset.action = 'edit-arr-offset';
        offsetWrapper.appendChild(offsetInput);

        timeRefRow.append(
            createDetailInput('edit-dep-time', 'time', 'Depart', dest.departureTime, 'clock'),
            createDetailInput('edit-arr-time', 'time', 'Arrive', dest.arrivalTime, 'clock-3'),
            offsetWrapper
        );
        
        controls.appendChild(timeRefRow);

        if (dest.transport === 'plane') {
            const flightRow = document.createElement('div');
            flightRow.className = 'flex gap-2 w-full items-center mt-1';
            const flightNumInput = createDetailInput('edit-flight-num', 'text', 'Flight No (IB2601)', dest.flightNumber, 'plane');
            const statsBtn = createIconButton('search-flightstats', 'compass', 'Track Flight', 'bg-gray-600 hover:bg-gray-500');
            statsBtn.dataset.fltnum = dest.flightNumber;
            
            flightRow.append(flightNumInput, statsBtn);
            controls.appendChild(flightRow);
        }

        connector.appendChild(controls);
        return connector;
    }

    function createIconButton(action, iconName, title, colorClass) {
        const btn = document.createElement('button');
        btn.className = `${colorClass} text-white p-1.5 rounded shadow transition-colors flex-shrink-0`;
        btn.dataset.action = action;
        btn.title = title;
        
        const iconSpan = document.createElement('span');
        iconSpan.dataset.lucide = iconName;
        iconSpan.className = 'w-3 h-3';
        
        btn.appendChild(iconSpan);
        return btn;
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
            if (dateDisplay) dateDisplay.textContent = `${DateUtils.formatLocale(currentStartDate)} → ${DateUtils.formatLocale(endDate)}`;

            const bookingBtn = item.querySelector('[data-action="search-hotel"]');
            const airbnbBtn = item.querySelector('[data-action="search-airbnb"]'); 
            
            if (bookingBtn) {
                bookingBtn.dataset.name = dest.name;
                bookingBtn.dataset.start = currentStartDate; 
                bookingBtn.dataset.end = endDate; 
            }
            
            if (airbnbBtn) {
                airbnbBtn.dataset.name = dest.name;
                airbnbBtn.dataset.start = currentStartDate; 
                airbnbBtn.dataset.end = endDate; 
            }

            const flightBtn = item.querySelector('[data-action="search-flight"]');
            const busBtn = item.querySelector('[data-action="search-bus"]'); 
            const trainBtn = item.querySelector('[data-action="search-train"]'); 
            const flightStatsBtn = item.querySelector('[data-action="search-flightstats"]'); 

            if ((flightBtn || busBtn || trainBtn || flightStatsBtn) && index < destinations.length - 1) { 
                const nextDest = destinations[index + 1];
                
                if (flightBtn) {
                    flightBtn.dataset.origin = dest.name;
                    flightBtn.dataset.dest = nextDest.name;
                    flightBtn.dataset.date = endDate;
                }
                if (busBtn) {
                    busBtn.dataset.origin = dest.name;
                    busBtn.dataset.dest = nextDest.name;
                    busBtn.dataset.date = endDate;
                }
                if (trainBtn) {
                    trainBtn.dataset.origin = dest.name;
                    trainBtn.dataset.dest = nextDest.name;
                    trainBtn.dataset.date = endDate;
                }
                if (flightStatsBtn) {
                     flightStatsBtn.dataset.fltnum = dest.flightNumber; 
                     flightStatsBtn.dataset.date = endDate; 
                }
            }

            const travelOffset = parseInt(dest.arrivalDayOffset) || 0;
            currentStartDate = DateUtils.addDays(endDate, travelOffset);
        });

        const remaining = totalDays - totalPlannedDays;
        summaryTotal.textContent = totalDays;
        summaryPlanned.textContent = totalPlannedDays;
        summaryRemaining.textContent = remaining;

        summaryRemainingBox.className = 'text-center p-3 rounded-xl border transition-colors duration-300';
        if (remaining < 0) summaryRemainingBox.classList.add('bg-red-900/50', 'border-red-700');
        else if (remaining === 0) summaryRemainingBox.classList.add('bg-green-900/50', 'border-green-700');
        else summaryRemainingBox.classList.add('bg-gray-700', 'border-gray-600');

        accCurrencySymbol.textContent = currencySymbol;
        transCurrencySymbol.textContent = currencySymbol;
        globalCurrencySymbol.textContent = currencySymbol;
        
        totalAccommodationSpan.textContent = formatCost(totalAccCost);
        totalTransportSpan.textContent = formatCost(totalTransCost);
        totalGlobalSpan.textContent = formatCost(totalAccCost + totalTransCost);

        updateURL();
    }

    // --- VALIDACION DE PEGAR (PASTE) ---
    function handlePasteValidation(e) {
        const type = e.target.type;
        if (type !== 'number') return;
        
        // Obtener el texto pegado
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        
        // Identificar contexto
        const action = e.target.dataset.action;
        const isInteger = e.target.classList.contains('days-input') || // Dias de ciudad
                          e.target.id === 'totalDays' ||               // Dias totales
                          action === 'edit-arr-offset';                // Offset
        
        if (isInteger) {
             // Enteros estrictos: solo digitos.
             // Bloquea puntos, comas, signos negativos, letras, etc.
             if (!/^\d+$/.test(paste)) {
                 e.preventDefault();
             }
        } else {
             // Costos (Floats): digitos y punto (sin signo negativo)
             if (!/^\d*\.?\d*$/.test(paste)) {
                 e.preventDefault();
             }
        }
    }

    // --- LISTENERS ---
    
    historyList.addEventListener('click', (e) => {
        const tripId = e.target.closest('.history-item')?.dataset.tripId;
        if (!tripId) return;

        if (e.target.closest('.edit-history-btn')) {
            renameTrip(e, tripId); 
            return;
        }
        if (e.target.closest('.delete-history-btn')) {
            deleteFromHistory(e, tripId);
            return;
        }

        const trip = tripHistory.find(t => t.id === tripId);
        if (trip) loadTripFromHistory(trip);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-suggestions') && !e.target.classList.contains('city-name-input')) {
            closeAllSuggestions();
        }
    });

    // Listener de 'input': valida inmediatamente si entra basura (ej. arrastrando)
    destinationList.addEventListener('input', (e) => {
        const target = e.target;
        const action = target.dataset.action;
        const id = target.dataset.id;
        if (!action || !id) return;
        const dest = destinations.find(d => d.id === id);
        if (!dest) return;

        if (action === 'edit-name') { 
            dest.name = target.value; 
            updateURL(); 
            handleCitySearch(target, id);
        }
        
        // Validacion Días (Entero >= 1)
        if (action === 'edit-days') { 
            let val = parseInt(target.value);
            // Si es inválido o < 1, forzar a 1 visualmente y en modelo inmediatamente
            // (Permitimos vacío temporalmente para que pueda borrar y escribir, pero no "0")
            if (target.value !== '' && (isNaN(val) || val < 1)) {
                val = 1;
                target.value = 1; 
            }
            // Si está vacío, asumimos 1 para el cálculo pero dejamos el input vacío para UX
            dest.days = isNaN(val) ? 1 : val; 
            updateCalculations(); 
        }
        
        // Validacion Costos (Reales >= 0)
        if (action === 'edit-acc-cost') { 
            if (target.value < 0) target.value = 0;
            dest.accommodationCost = target.value; 
            updateCalculations(); 
        }
        if (action === 'edit-trans-cost') { 
            if (target.value < 0) target.value = 0;
            dest.transportCost = target.value; 
            updateCalculations(); 
        }
        
        // Validacion Offset (Entero >= 0)
        if (action === 'edit-arr-offset') { 
            let val = parseInt(target.value);
            if (target.value !== '' && (isNaN(val) || val < 0)) {
                val = 0;
                target.value = 0;
            }
            dest.arrivalDayOffset = isNaN(val) ? 0 : val; 
            updateCalculations(); 
        } 

        if (action === 'edit-dep-time') { dest.departureTime = target.value; updateURL(); }
        if (action === 'edit-arr-time') { dest.arrivalTime = target.value; updateURL(); }
        if (action === 'edit-flight-num') { dest.flightNumber = target.value; updateCalculations(); }
    });

    // Bloqueo de teclas invalidas (Keydown)
    destinationList.addEventListener('keydown', (e) => {
        if (e.target.type !== 'number') return;

        const action = e.target.dataset.action;
        const isStrictInteger = 
            e.target.classList.contains('days-input') || 
            action === 'edit-arr-offset';

        // Prohibir -, +, e
        const invalidChars = ['-', '+', 'e'];

        // Si es entero estricto, prohibir punto
        if (isStrictInteger) {
            invalidChars.push('.');
        }

        if (invalidChars.includes(e.key)) {
            e.preventDefault();
        }
    });

    // Bloqueo de Pegado (Paste) Delegado
    destinationList.addEventListener('paste', handlePasteValidation);

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
            showModal(
                "Are you sure you want to delete this destination?", 
                () => {
                    destinations = destinations.filter(d => d.id !== btn.dataset.id);
                    renderList();
                },
                "Delete Destination"
            );
        }
        if (action === 'search-hotel') {
            handleHotelSearch(btn.dataset.name, btn.dataset.start, btn.dataset.end);
        }
        if (action === 'search-airbnb') {
             handleAirbnbSearch(btn.dataset.name, btn.dataset.start, btn.dataset.end);
        }
        if (action === 'search-flight') {
            handleFlightSearch(btn.dataset.origin, btn.dataset.dest, btn.dataset.date);
        }
        if (action === 'search-bus') {
            handleBusSearch(btn.dataset.origin, btn.dataset.dest, btn.dataset.date); 
        }
        if (action === 'search-train') {
            handleTrainSearch(btn.dataset.origin, btn.dataset.dest, btn.dataset.date); 
        }
        if (action === 'search-flightstats') {
             handleFlightStatsSearch(btn.dataset.fltnum, btn.dataset.date); 
        }
    });
    
    currencySelector.addEventListener('change', (e) => {
        currencyCode = e.target.value;
        const selectedOption = e.target.querySelector(`option[value="${currencyCode}"]`);
        currencySymbol = selectedOption ? selectedOption.dataset.symbol : '$';
        renderList(); 
    });
    
    if(saveHistoryBtn) saveHistoryBtn.addEventListener('click', saveToHistory);
    if(closeHistoryBtn) closeHistoryBtn.addEventListener('click', closeSidebar);
    if(copySeedBtn) copySeedBtn.addEventListener('click', copyHistorySeed);
    if(loadSeedBtn) loadSeedBtn.addEventListener('click', loadHistorySeed);
    
    if(toggleHistoryBtn) {
        toggleHistoryBtn.addEventListener('click', () => {
            if (historySidebar.classList.contains('-translate-x-full')) {
                openSidebar();
            } else {
                closeSidebar();
            }
        });
    }

    function exportToICS() {
        if (destinations.length === 0) return showModal(i18n.get("ics_no_destinations"), null, i18n.get("modal_info"));
        let ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TripPlan//EN", "CALSCALE:GREGORIAN"];
        let curr = startDate;
        destinations.forEach((dest, idx) => {
            const start = DateUtils.formatICS(curr);
            const next = DateUtils.addDays(curr, dest.days);
            const end = DateUtils.formatICS(next);
            let desc = `${i18n.get("ics_stay")}: ${dest.days} days.`;
            if (dest.accommodationCost) desc += `\\n${i18n.get("ics_hotel")}: ${currencySymbol}${formatCost(dest.accommodationCost)}`;
            
            if (idx < destinations.length - 1) {
                if (dest.transportCost) desc += `\\n${i18n.get("ics_transport")}: ${dest.transport} (${currencySymbol}${formatCost(dest.transportCost)})`;
                if (dest.departureTime) desc += `\\nDeparture Time: ${dest.departureTime}`;
                if (dest.arrivalTime) desc += `\\nArrival Time: ${dest.arrivalTime}`;
                if (dest.flightNumber) desc += `\\nFlight No: ${dest.flightNumber}`;
                if (dest.arrivalDayOffset > 0) desc += `\\nArrival Offset: +${dest.arrivalDayOffset} day(s)`;
            }

            ics.push("BEGIN:VEVENT", `DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${end}`, `SUMMARY:${i18n.get("ics_trip_to")} ${dest.name}`, `DESCRIPTION:${desc}`, "END:VEVENT");
            
            const travelOffset = parseInt(dest.arrivalDayOffset) || 0;
            curr = DateUtils.addDays(next, travelOffset);
        });
        ics.push("END:VCALENDAR");
        const blob = new Blob([ics.join("\r\n")], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = 'itinerary.ics';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }

    function generateId() { 
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID(); 
        }
        return 'id-' + Math.random().toString(36).substr(2, 16);
    }
    
    function addDestination(name = "New City") {
        destinations.push({ 
            id: generateId(), 
            name: name, 
            days: 1, 
            accommodationCost: "", 
            transport: "plane", 
            transportCost: "",
            departureTime: "", 
            arrivalTime: "",   
            arrivalDayOffset: 0,
            bookingRef: "",    
            flightNumber: ""   
        });
        renderList();
    }

    // --- INIT ---
    function init() {
        addBtn.addEventListener('click', () => addDestination());
        startDateInput.addEventListener('change', (e) => { startDate = e.target.value; updateCalculations(); });
        
        // Listeners para Total Days
        totalDaysInput.addEventListener('keydown', (e) => {
            if (['-', '+', 'e', '.'].includes(e.key)) {
                e.preventDefault();
            }
        });

        // Validar Pegado en Total Days
        totalDaysInput.addEventListener('paste', handlePasteValidation);
        
        // Validar Input en tiempo real (no permitir < 1)
        totalDaysInput.addEventListener('input', (e) => { 
            let val = parseInt(e.target.value, 10);
            // Si el usuario borra todo, dejamos vacío momentáneamente. Pero si escribe 0, corregimos.
            if (e.target.value !== '' && (isNaN(val) || val < 1)) {
                val = 1;
                e.target.value = 1;
            }
            totalDays = isNaN(val) ? 1 : val; 
            updateCalculations(); 
        });

        // Validar Change (blur) para asegurar que no quede vacío
        totalDaysInput.addEventListener('change', (e) => {
            let val = parseInt(e.target.value, 10);
            if (isNaN(val) || val < 1) {
                val = 1;
                e.target.value = 1;
            }
            totalDays = val;
            updateCalculations();
        });
        
        autofillBtn.addEventListener('click', () => {
            if (!destinations.length) return;
            const b = Math.floor(totalDays / destinations.length), r = totalDays % destinations.length;
            destinations.forEach((d, i) => d.days = b + (i < r ? 1 : 0));
            renderList();
        });
        
        bulkAddTextarea.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                bulkAddBtn.click(); 
            } 
        });
        
        bulkAddBtn.addEventListener('click', () => {
            if (bulkAddTextarea.value) { 
                bulkAddTextarea.value.split(/[\n,]/).forEach(n => { if(n.trim()) addDestination(n.trim()) }); 
                bulkAddTextarea.value=''; 
            }
        });

        resetBtn.addEventListener('click', () => showModal(i18n.get("modal_delete_everything"), () => { 
            destinations=[]; 
            startDate=new Date().toISOString().split('T')[0]; 
            totalDays=14; 
            startDateInput.value=startDate; 
            totalDaysInput.value=totalDays; 
            updateCalculations(); 
            renderList(); 
        }, i18n.get("modal_confirm_reset")));

        saveBtn.addEventListener('click', () => {
            if (!destinations.length) return showModal(i18n.get("modal_empty_itinerary"), null, i18n.get("modal_info"));
            const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({startDate, totalDays, currencyCode, destinations}, null, 2)], {type:'application/json'}));
            a.download=`trip-${startDate}.json`; a.click();
        });
        loadBtn.addEventListener('click', () => loadInput.click());
        
        loadInput.addEventListener('change', (e) => {
            const f = e.target.files[0];
            if(f) { 
                const r=new FileReader(); 
                r.onload=(ev)=>{ 
                    try{ 
                        const d=JSON.parse(ev.target.result); 
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

        if (!startDateInput.value) startDateInput.value = startDate;
        totalDaysInput.value = totalDays;
        
        currencySelector.value = currencyCode; 

        lucide.createIcons();

        loadFromURL();
        
        renderHistory();
        
        const isDesktop = window.innerWidth >= 768;
        
        if (isDesktop) {
             const storedState = localStorage.getItem('history_sidebar_open');
             if (storedState === 'true' || storedState === null) {
                 openSidebar();
             }
        }

        if (!destinations.length) renderList(); 
    }
    init();
});