import { containerBootstrap } from '@nlpjs/core-loader'
import { Nlp } from '@nlpjs/nlp'
import { LangAll } from '@nlpjs/lang-all'
import dotenv from 'dotenv'

import log from '@/helpers/log'
import lang from '@/helpers/lang'
import trainGlobalResolvers from './train-resolvers-model/train-global-resolvers'
import trainSkillsResolvers from './train-resolvers-model/train-skills-resolvers'
import trainGlobalEntities from './train-main-model/train-global-entities'
import trainSkillsActions from './train-main-model/train-skills-actions'

dotenv.config()

/**
 * Training utterance samples script
 *
 * npm run train [en or fr]
 */
export default () => new Promise(async (resolve, reject) => {
  const resolversModelFileName = 'core/data/models/leon-resolvers-model.nlp'
  const mainModelFileName = 'core/data/models/leon-main-model.nlp'

  try {
    /**
     * Resolvers NLP model configuration
     */
    const resolversContainer = await containerBootstrap()

    resolversContainer.use(Nlp)
    resolversContainer.use(LangAll)

    const resolversNlp = resolversContainer.get('nlp')
    const resolversNluManager = resolversContainer.get('nlu-manager')

    resolversNluManager.settings.log = false
    resolversNluManager.settings.trainByDomain = true
    resolversNlp.settings.modelFileName = resolversModelFileName
    resolversNlp.settings.threshold = 0.8

    /**
     * Main NLP model configuration
     */
    const mainContainer = await containerBootstrap()

    mainContainer.use(Nlp)
    mainContainer.use(LangAll)

    const mainNlp = mainContainer.get('nlp')
    const mainNluManager = mainContainer.get('nlu-manager')
    // const mainSlotManager = container.get('SlotManager')

    mainNluManager.settings.log = false
    mainNluManager.settings.trainByDomain = true
    // mainSlotManager.settings.
    mainNlp.settings.forceNER = true // https://github.com/axa-group/nlp.js/blob/master/examples/17-ner-nlg/index.js
    // mainNlp.settings.nlu = { useNoneFeature: true }
    mainNlp.settings.calculateSentiment = true
    mainNlp.settings.modelFileName = mainModelFileName
    mainNlp.settings.threshold = 0.8

    /**
     * Training phases
     */
    const shortLangs = lang.getShortLangs()
    for (let h = 0; h < shortLangs.length; h += 1) {
      const lang = shortLangs[h]

      resolversNlp.addLanguage(lang)
      // eslint-disable-next-line no-await-in-loop
      await trainGlobalResolvers(lang, resolversNlp)
      // eslint-disable-next-line no-await-in-loop
      await trainSkillsResolvers(lang, resolversNlp)

      mainNlp.addLanguage(lang)
      // eslint-disable-next-line no-await-in-loop
      await trainGlobalEntities(lang, mainNlp)
      // eslint-disable-next-line no-await-in-loop
      await trainSkillsActions(lang, mainNlp)
    }

    try {
      await resolversNlp.train()

      log.success(`Resolvers NLP model saved in ${resolversModelFileName}`)
      resolve()
    } catch (e) {
      log.error(`Failed to save resolvers NLP model: ${e}`)
      reject()
    }

    try {
      await mainNlp.train()

      log.success(`Main NLP model saved in ${mainModelFileName}`)
      resolve()
    } catch (e) {
      log.error(`Failed to save main NLP model: ${e}`)
      reject()
    }
  } catch (e) {
    log.error(e.message)
    reject(e)
  }
})
