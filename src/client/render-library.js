import { defineComponent } from '@openuidev/react-lang'
import { openuiChatLibrary } from '@openuidev/react-ui/genui-lib'
import { React } from './react.js'

const section = openuiChatLibrary.components.SectionBlock

const flatSection = defineComponent({
  name: section.name,
  props: section.props,
  description: section.description,
  component: input => React.createElement(section.component, {
    ...input,
    props: { ...input.props, isFoldable: false },
  }),
})

// Keep the official parser, schema and component renderer; only change the
// presentation of SectionBlock in this chat surface.
export const openuiRenderLibrary = openuiChatLibrary.extend({
  components: { override: [flatSection] },
})
