import DefaultTheme from 'vitepress/theme'
import SubmissionsPanel from './SubmissionsPanel.vue'
import MagazineShelf from './MagazineShelf.vue'
import MagazineReader from './MagazineReader.vue'
import CommunityWidget from './CommunityWidget.vue'
import ContentComposer from './ContentComposer.vue'
import './custom.css'
import './magazine.css'

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('SubmissionsPanel', SubmissionsPanel)
    app.component('MagazineShelf', MagazineShelf)
    app.component('MagazineReader', MagazineReader)
    app.component('CommunityWidget', CommunityWidget)
    app.component('ContentComposer', ContentComposer)
  }
}
