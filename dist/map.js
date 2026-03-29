/* Simple World Map - No external libraries */
class SimpleWorldMap {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        
        this.svg = null;
        this.points = [];
        this.init();
    }
    
    init() {
        // Create SVG element
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('viewBox', '0 0 1000 500');
        this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        this.svg.style.width = '100%';
        this.svg.style.height = '100%';
        
        // Simple world map outline (simplified continents)
        this.drawContinents();
        
        this.container.appendChild(this.svg);
        
        // Load observation data
        this.loadObservations();
        
        // Refresh every 30 seconds
        setInterval(() => this.loadObservations(), 30000);
    }
    
    drawContinents() {
        // Simplified continent paths (approximate coordinates)
        const continents = [
            // North America
            'M 180,100 L 280,80 L 320,120 L 300,200 L 250,250 L 200,200 L 180,150 Z',
            // South America
            'M 280,280 L 320,300 L 300,400 L 280,450 L 260,400 L 250,320 Z',
            // Europe
            'M 460,100 L 520,90 L 540,120 L 500,140 L 470,130 Z',
            // Africa
            'M 460,180 L 540,170 L 570,250 L 540,350 L 480,340 L 450,250 Z',
            // Asia
            'M 560,80 L 800,70 L 850,150 L 800,200 L 700,180 L 590,140 Z',
            // Australia
            'M 780,320 L 860,310 L 880,370 L 820,400 L 770,360 Z',
            // Antarctica
            'M 200,470 L 800,470 L 800,490 L 200,490 Z'
        ];
        
        continents.forEach(path => {
            const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathEl.setAttribute('d', path);
            pathEl.setAttribute('fill', 'rgba(255,255,255,0.05)');
            pathEl.setAttribute('stroke', 'rgba(255,255,255,0.1)');
            pathEl.setAttribute('stroke-width', '1');
            this.svg.appendChild(pathEl);
        });
        
        // Add grid lines (latitude/longitude)
        this.drawGrid();
    }
    
    drawGrid() {
        // Simple latitude lines
        for (let y = 50; y <= 450; y += 50) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '0');
            line.setAttribute('y1', y);
            line.setAttribute('x2', '1000');
            line.setAttribute('y2', y);
            line.setAttribute('stroke', 'rgba(255,255,255,0.05)');
            line.setAttribute('stroke-width', '0.5');
            this.svg.appendChild(line);
        }
        
        // Simple longitude lines
        for (let x = 100; x <= 900; x += 100) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x);
            line.setAttribute('y1', '0');
            line.setAttribute('x2', x);
            line.setAttribute('y2', '500');
            line.setAttribute('stroke', 'rgba(255,255,255,0.05)');
            line.setAttribute('stroke-width', '0.5');
            this.svg.appendChild(line);
        }
    }
    
    // Convert lat/lon to SVG coordinates
    project(lat, lon) {
        // Simple equirectangular projection
        // Map: lat -90..90 → y 500..0, lon -180..180 → x 0..1000
        const x = ((lon + 180) / 360) * 1000;
        const y = ((90 - lat) / 180) * 500;
        return { x, y };
    }
    
    async loadObservations() {
        try {
            const response = await fetch('https://atmosnet-backend.onrender.com/v1/observations/stats/network');
            if (!response.ok) throw new Error('Failed to fetch stats');
            
            const data = await response.json();
            // Note: The API doesn't return individual points, so we'll generate mock points
            // In production, you'd add an endpoint that returns recent observations with lat/lon
            this.displayMockPoints(data.active_devices || 0);
        } catch (error) {
            console.error('Map error:', error);
            this.displayMockPoints(0);
        }
    }
    
    displayMockPoints(deviceCount) {
        // Clear existing points
        const existingPoints = this.container.querySelectorAll('.map-point');
        existingPoints.forEach(p => p.remove());
        
        // Generate random points distributed by continent (approximate)
        const regions = [
            { lat: 40, lon: -100, count: Math.floor(deviceCount * 0.25) }, // North America
            { lat: -15, lon: -60, count: Math.floor(deviceCount * 0.15) }, // South America
            { lat: 50, lon: 10, count: Math.floor(deviceCount * 0.20) },   // Europe
            { lat: 20, lon: 30, count: Math.floor(deviceCount * 0.25) },   // Africa
            { lat: 35, lon: 100, count: Math.floor(deviceCount * 0.25) },  // Asia
            { lat: -25, lon: 135, count: Math.floor(deviceCount * 0.05) }, // Australia
            { lat: -80, lon: 0, count: Math.floor(deviceCount * 0.01) }    // Antarctica
        ];
        
        regions.forEach(region => {
            for (let i = 0; i < region.count; i++) {
                const lat = region.lat + (Math.random() - 0.5) * 30;
                const lon = region.lon + (Math.random() - 0.5) * 40;
                const coord = this.project(lat, lon);
                
                // Only draw if within reasonable bounds
                if (coord.x > -20 && coord.x < 1020 && coord.y > -20 && coord.y < 520) {
                    this.addPoint(coord.x, coord.y, lat, lon);
                }
            }
        });
    }
    
    addPoint(x, y, lat, lon) {
        const point = document.createElement('div');
        point.className = 'map-point';
        point.style.left = x + 'px';
        point.style.top = y + 'px';
        point.title = `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`;
        
        // Click to see info
        point.onclick = () => {
            alert(`🌍 Observation Node\nLatitude: ${lat.toFixed(4)}\nLongitude: ${lon.toFixed(4)}`);
        };
        
        this.container.appendChild(point);
    }
}

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', () => {
    const mapContainer = document.getElementById('worldMap');
    if (mapContainer) {
        window.worldMap = new SimpleWorldMap('worldMap');
    }
});