import * as save from './storage/save.js';
import { AdService } from './services/ads.js';
import { mount } from './ui/ui.js';

save.load();
AdService.init();
mount(document.getElementById('app'));
