const TDT_KEY = '4c7bbe37d756ea621a7d8df0ef41e98b';
const INITIAL_VIEW = { center: [34.3, 108.9], zoom: 5 };

const app = document.getElementById('app');
const loginPage = document.getElementById('loginPage');
const loginError = document.getElementById('loginError');
const userLabel = document.getElementById('userLabel');
const mouseCoord = document.getElementById('mouseCoord');

let map;
let compareMaps = { left: null, right: null };
let drawLayer;
let sideBySideControl;
let queryRectangle;

const overlayDefs = [
  {
    id: 'countries',
    name: '国家边界(opengeo:countries)',
    legend: '蓝色边界 + 半透明填充',
    url: 'https://ahocevar.com/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=opengeo:countries&outputFormat=application/json&maxFeatures=150',
    style: { color: '#3388ff', weight: 1.3, fillOpacity: 0.2 }
  },
  {
    id: 'water',
    name: '水域面(osm:water_areas)',
    legend: '青蓝色水域面',
    url: 'https://ahocevar.com/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=osm:water_areas&outputFormat=application/json&maxFeatures=120',
    style: { color: '#00a3c7', weight: 1, fillOpacity: 0.25 }
  },
  {
    id: 'roads',
    name: '道路(ne:ne_10m_roads)',
    legend: '橙色道路线',
    url: 'https://ahocevar.com/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=ne:ne_10m_roads&outputFormat=application/json&maxFeatures=200',
    style: { color: '#ff7f0e', weight: 1.2 }
  }
];

const overlays = new Map();

const adminData = [
  { name: '全国', bbox: [[18, 73], [54, 136]] },
  { name: '华北示例区', bbox: [[35, 110], [42, 120]] },
  { name: '华东示例区', bbox: [[26, 116], [35, 123]] },
  { name: '华南示例区', bbox: [[20, 105], [26, 117]] }
];

function tdtLayer(kind) {
  return L.tileLayer(
    `https://t{s}.tianditu.gov.cn/${kind}_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${kind}&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TDT_KEY}`,
    { subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'], minZoom: 3, maxZoom: 18 }
  );
}

const baseLayers = {
  vec: L.layerGroup([tdtLayer('vec'), tdtLayer('cva')]),
  img: L.layerGroup([tdtLayer('img'), tdtLayer('cia')])
};

function initApp() {
  map = L.map('map', {
    zoomControl: true,
    minZoom: 3,
    maxZoom: 18,
    center: INITIAL_VIEW.center,
    zoom: INITIAL_VIEW.zoom
  });

  baseLayers.vec.addTo(map);
  L.control.scale({ imperial: false }).addTo(map);
  map.on('mousemove', (e) => {
    mouseCoord.textContent = `坐标: ${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
  });

  drawLayer = new L.FeatureGroup().addTo(map);
  map.addControl(new L.Control.Draw({ edit: { featureGroup: drawLayer } }));
  map.on(L.Draw.Event.CREATED, (e) => drawLayer.addLayer(e.layer));
  L.control.measure({ position: 'topright', primaryLengthUnit: 'meters', primaryAreaUnit: 'sqmeters' }).addTo(map);

  bindBaseMapSwitch();
  renderOverlayPanel();
  renderAdminList(adminData);
  renderBookmarks();
  bindToolbar();
  bindTabs();
}

async function loadOverlay(def) {
  if (overlays.get(def.id)?.layer) return overlays.get(def.id).layer;
  const data = await fetch(def.url).then((r) => r.json());
  const layer = L.geoJSON(data, {
    style: def.style,
    onEachFeature(feature, featureLayer) {
      const rows = Object.entries(feature.properties || {})
        .slice(0, 10)
        .map(([k, v]) => `<tr><td>${k}</td><td>${v ?? ''}</td></tr>`)
        .join('');
      featureLayer.bindPopup(`<table>${rows}</table>`);
      featureLayer.on('mouseover', () => featureLayer.setStyle({ weight: 3, color: '#ff0' }));
      featureLayer.on('mouseout', () => layer.resetStyle(featureLayer));
      featureLayer.on('click', () => featureLayer.setStyle({ color: '#f00', weight: 3 }));
    }
  });
  overlays.set(def.id, { ...def, layer, opacity: 1, visible: false });
  return layer;
}

function bindBaseMapSwitch() {
  document.querySelectorAll('input[name="basemap"]').forEach((el) => {
    el.addEventListener('change', () => {
      Object.values(baseLayers).forEach((b) => map.removeLayer(b));
      baseLayers[el.value].addTo(map);
    });
  });
}

function renderOverlayPanel() {
  const container = document.getElementById('overlayList');
  container.innerHTML = '';

  overlayDefs.forEach((def, idx) => {
    const item = document.createElement('div');
    item.className = 'overlay-item';
    item.innerHTML = `
      <label><input type="checkbox" data-id="${def.id}"/> ${def.name}</label>
      <div class="row"><span>透明度</span><input type="range" min="0" max="100" value="100" data-op="opacity" data-id="${def.id}"/></div>
      <div class="row">
        <button data-op="up" data-idx="${idx}">上移</button>
        <button data-op="down" data-idx="${idx}">下移</button>
        <button data-op="legend">图例</button>
      </div>
      <div class="legend hidden">${def.legend}</div>
    `;
    container.appendChild(item);
  });

  container.addEventListener('change', async (e) => {
    const id = e.target.dataset.id;
    if (e.target.type === 'checkbox') {
      const def = overlayDefs.find((d) => d.id === id);
      const layer = await loadOverlay(def);
      if (e.target.checked) {
        layer.addTo(map);
        overlays.get(id).visible = true;
      } else {
        map.removeLayer(layer);
        overlays.get(id).visible = false;
      }
    }

    if (e.target.dataset.op === 'opacity') {
      const val = Number(e.target.value) / 100;
      const obj = overlays.get(id);
      obj.opacity = val;
      obj.layer.eachLayer((l) => {
        if (l.setStyle) l.setStyle({ opacity: val, fillOpacity: Math.max(0.05, val * 0.4) });
      });
    }
  });

  container.addEventListener('click', (e) => {
    const op = e.target.dataset.op;
    if (op === 'legend') {
      const legend = e.target.closest('.overlay-item').querySelector('.legend');
      legend.classList.toggle('hidden');
    }
    if (op === 'up' || op === 'down') {
      const idx = Number(e.target.dataset.idx);
      const newIdx = op === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= overlayDefs.length) return;
      [overlayDefs[idx], overlayDefs[newIdx]] = [overlayDefs[newIdx], overlayDefs[idx]];
      renderOverlayPanel();
      overlayDefs.forEach((d) => {
        const obj = overlays.get(d.id);
        if (obj?.visible) obj.layer.bringToFront();
      });
    }
  });
}

function renderAdminList(data) {
  const list = document.getElementById('adminList');
  list.innerHTML = '';
  data.forEach((a) => {
    const li = document.createElement('li');
    li.textContent = a.name;
    li.addEventListener('click', () => map.fitBounds(a.bbox));
    list.appendChild(li);
  });
}

function getBookmarks() {
  return JSON.parse(localStorage.getItem('map_bookmarks') || '[]');
}

function setBookmarks(data) {
  localStorage.setItem('map_bookmarks', JSON.stringify(data));
}

function renderBookmarks() {
  const list = document.getElementById('bookmarkList');
  list.innerHTML = '';
  getBookmarks().forEach((b, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${b.name}</strong><div class="row"><button data-op="go">定位</button><button data-op="rename">重命名</button><button data-op="del">删除</button></div>`;
    li.querySelector('[data-op="go"]').onclick = () => {
      map.setView(b.center, b.zoom);
      Object.values(baseLayers).forEach((l) => map.removeLayer(l));
      baseLayers[b.base || 'vec'].addTo(map);
    };
    li.querySelector('[data-op="rename"]').onclick = () => {
      const n = prompt('新名称', b.name);
      if (!n) return;
      const all = getBookmarks();
      all[idx].name = n;
      setBookmarks(all);
      renderBookmarks();
    };
    li.querySelector('[data-op="del"]').onclick = () => {
      const all = getBookmarks();
      all.splice(idx, 1);
      setBookmarks(all);
      renderBookmarks();
    };
    list.appendChild(li);
  });
}

function parseCoord(input) {
  const text = input.trim();
  if (text.includes('°')) {
    const parts = text.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
    if (!parts || parts.length < 6) return null;
    const lat = parts[0] + parts[1] / 60 + parts[2] / 3600;
    const lng = parts[3] + parts[4] / 60 + parts[5] / 3600;
    return [lat, lng];
  }
  const nums = text.split(/[,\s]+/).map(Number);
  if (nums.length >= 2 && nums.every((v) => !Number.isNaN(v))) return [nums[0], nums[1]];
  return null;
}

function bindToolbar() {
  document.querySelector('.toolbar').addEventListener('click', async (e) => {
    const tool = e.target.dataset.tool;
    if (!tool) return;

    if (tool === 'home') map.setView(INITIAL_VIEW.center, INITIAL_VIEW.zoom);
    if (tool === 'locate') {
      const text = prompt('输入坐标(纬度,经度 或 DMS)');
      const parsed = text ? parseCoord(text) : null;
      if (!parsed) return alert('坐标格式错误');
      map.setView(parsed, 10);
      L.marker(parsed).addTo(map).bindPopup('定位点').openPopup();
    }
    if (tool === 'query') {
      if (queryRectangle) map.removeLayer(queryRectangle);
      const bounds = map.getBounds();
      queryRectangle = L.rectangle(bounds.pad(-0.5), { color: '#e60000', weight: 2 }).addTo(map);
      const count = [];
      overlays.forEach((obj) => {
        if (!obj.visible) return;
        obj.layer.eachLayer((l) => {
          const c = l.getBounds ? l.getBounds().getCenter() : l.getLatLng?.();
          if (c && queryRectangle.getBounds().contains(c)) count.push(l);
        });
      });
      alert(`范围内要素数量: ${count.length}`);
    }
    if (tool === 'screenshot') {
      const canvas = await html2canvas(document.querySelector('.map-area'));
      const link = document.createElement('a');
      link.download = `map-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
    if (tool === 'split') startSplitCompare();
    if (tool === 'swipe') startSwipeCompare();
    if (tool === 'exitCompare') exitCompare();
  });
}

function startSplitCompare() {
  exitCompare();
  document.getElementById('map').classList.add('hidden');
  const split = document.getElementById('splitContainer');
  split.classList.remove('hidden');

  compareMaps.left = L.map('mapLeft').setView(map.getCenter(), map.getZoom());
  compareMaps.right = L.map('mapRight').setView(map.getCenter(), map.getZoom());
  baseLayers.vec.addTo(compareMaps.left);
  baseLayers.img.addTo(compareMaps.right);

  let syncing = false;
  const sync = (src, dst) => src.on('move', () => {
    if (syncing) return;
    syncing = true;
    dst.setView(src.getCenter(), src.getZoom(), { animate: false });
    syncing = false;
  });
  sync(compareMaps.left, compareMaps.right);
  sync(compareMaps.right, compareMaps.left);
}

function startSwipeCompare() {
  exitCompare();
  const left = L.layerGroup([tdtLayer('vec'), tdtLayer('cva')]).addTo(map);
  const right = L.layerGroup([tdtLayer('img'), tdtLayer('cia')]).addTo(map);
  sideBySideControl = L.control.sideBySide(left, right).addTo(map);
}

function exitCompare() {
  if (sideBySideControl) {
    sideBySideControl.remove();
    sideBySideControl = null;
    Object.values(baseLayers).forEach((l) => map.removeLayer(l));
    baseLayers.vec.addTo(map);
  }

  if (compareMaps.left || compareMaps.right) {
    compareMaps.left?.remove();
    compareMaps.right?.remove();
    compareMaps.left = null;
    compareMaps.right = null;
    document.getElementById('splitContainer').classList.add('hidden');
    document.getElementById('map').classList.remove('hidden');
    map.invalidateSize();
  }
}

function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    };
  });

  document.getElementById('adminSearch').addEventListener('input', (e) => {
    const keyword = e.target.value.trim();
    renderAdminList(adminData.filter((a) => a.name.includes(keyword)));
  });

  document.getElementById('globalSearch').addEventListener('change', (e) => {
    const found = adminData.find((a) => a.name.includes(e.target.value.trim()));
    if (found) map.fitBounds(found.bbox);
  });

  document.getElementById('saveBookmarkBtn').onclick = () => {
    const name = document.getElementById('bookmarkName').value.trim() || `书签-${Date.now()}`;
    const activeBase = document.querySelector('input[name="basemap"]:checked').value;
    const data = getBookmarks();
    data.push({ name, center: map.getCenter(), zoom: map.getZoom(), base: activeBase });
    setBookmarks(data);
    renderBookmarks();
  };
}

function loginFlow() {
  const user = localStorage.getItem('map_user');
  if (user) {
    loginPage.classList.add('hidden');
    app.classList.remove('hidden');
    userLabel.textContent = `用户: ${user}`;
    initApp();
  }
}

document.getElementById('loginBtn').onclick = () => {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!username || !password) {
    loginError.textContent = '用户名和密码不能为空';
    return;
  }
  localStorage.setItem('map_user', username);
  location.reload();
};

document.getElementById('logoutBtn').onclick = () => {
  localStorage.removeItem('map_user');
  localStorage.removeItem('map_bookmarks');
  location.reload();
};

loginFlow();
