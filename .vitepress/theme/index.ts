import DefaultTheme from 'vitepress/theme'
import CommunityWidget from './CommunityWidget.vue'
import MagazineShelf from './MagazineShelf.vue'
import MagazineReader from './MagazineReader.vue'
import HotList from './HotList.vue'
import ForumLinks from './ForumLinks.vue'
import ForumList from './ForumList.vue'
import ContentReactions from './ContentReactions.vue'
import PostComposer from './PostComposer.vue'
import ContentFeed from './ContentFeed.vue'
import './custom.css'
import './magazine.css'

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('CommunityWidget', CommunityWidget)
        app.component('MagazineShelf', MagazineShelf)
    app.component('MagazineReader', MagazineReader)
    app.component('HotList', HotList)
    app.component('ForumLinks', ForumLinks)
    app.component('ForumList', ForumList)
    app.component('ContentReactions', ContentReactions)
    app.component('PostComposer', PostComposer)
    app.component('ContentFeed', ContentFeed)
  }
}

