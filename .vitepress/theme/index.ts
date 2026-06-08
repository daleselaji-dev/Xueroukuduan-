import DefaultTheme from 'vitepress/theme'
import SubmissionsPanel from './SubmissionsPanel.vue'
import MagazineShelf from './MagazineShelf.vue'
import MagazineReader from './MagazineReader.vue'
import HotList from './HotList.vue'
import ForumLinks from './ForumLinks.vue'
import ForumList from './ForumList.vue'
import './custom.css'
import './magazine.css'

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('SubmissionsPanel', SubmissionsPanel)
    app.component('MagazineShelf', MagazineShelf)
    app.component('MagazineReader', MagazineReader)
    app.component('HotList', HotList)
    app.component('ForumLinks', ForumLinks)
    app.component('ForumList', ForumList)
  }
}
