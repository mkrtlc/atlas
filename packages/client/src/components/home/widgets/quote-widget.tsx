import { useMemo } from 'react';
import { Quote } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { WidgetDefinition, WidgetProps } from './types';

interface QuoteEntry { text: string; author: string }

const QUOTES: Record<string, QuoteEntry[]> = {
  en: [
    { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
    { text: 'Imagination is more important than knowledge.', author: 'Albert Einstein' },
    { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
    { text: 'Stay hungry, stay foolish.', author: 'Steve Jobs' },
    { text: 'Be yourself; everyone else is already taken.', author: 'Oscar Wilde' },
    { text: 'The mind is everything. What you think you become.', author: 'Buddha' },
    { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
    { text: 'Creativity is intelligence having fun.', author: 'Albert Einstein' },
    { text: 'The journey of a thousand miles begins with one step.', author: 'Lao Tzu' },
    { text: 'Without music, life would be a mistake.', author: 'Friedrich Nietzsche' },
    { text: 'An unexamined life is not worth living.', author: 'Socrates' },
    { text: 'Quality is not an act, it is a habit.', author: 'Aristotle' },
    { text: 'A room without books is like a body without a soul.', author: 'Marcus Tullius Cicero' },
    { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
    { text: 'What we know is a drop, what we don\'t know is an ocean.', author: 'Isaac Newton' },
    { text: 'Live as if you were to die tomorrow. Learn as if you were to live forever.', author: 'Mahatma Gandhi' },
    { text: 'Turn your wounds into wisdom.', author: 'Oprah Winfrey' },
    { text: 'It always seems impossible until it\'s done.', author: 'Nelson Mandela' },
    { text: 'Happiness depends upon ourselves.', author: 'Aristotle' },
    { text: 'Love the life you live. Live the life you love.', author: 'Bob Marley' },
    { text: 'All our dreams can come true, if we have the courage to pursue them.', author: 'Walt Disney' },
    { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Aristotle' },
    { text: 'Not how long, but how well you have lived is the main thing.', author: 'Seneca' },
    { text: 'Education is the most powerful weapon which you can use to change the world.', author: 'Nelson Mandela' },
    { text: 'I think, therefore I am.', author: 'Rene Descartes' },
  ],
  tr: [
    { text: 'Hayatta en hakiki mürşit ilimdir.', author: 'Mustafa Kemal Atatürk' },
    { text: 'Bir insanı yargılamadan önce, onun ayakkabılarıyla bir mil yürüyün.', author: 'Mevlana' },
    { text: 'Dün geçti, yarın henüz gelmedi. Sadece bugün var. Haydi başlayalım.', author: 'Aziz Nesin' },
    { text: 'Yaşamak şakaya gelmez, büyük bir ciddiyetle yaşayacaksın.', author: 'Nazım Hikmet' },
    { text: 'Kendini bil, dünyayı bilirsin.', author: 'Yunus Emre' },
    { text: 'Sabır acıdır ama meyvesi tatlıdır.', author: 'Mevlana' },
    { text: 'Her şey yürekten başlar.', author: 'Mevlana' },
    { text: 'Okumak, bir insanı doldurur; konuşmak hazırlar; yazmak ise olgunlaştırır.', author: 'Francis Bacon' },
    { text: 'Güzel günler göreceğiz çocuklar, güneşli günler göreceğiz.', author: 'Nazım Hikmet' },
    { text: 'İnsan, ancak hayal edebildiği kadar özgürdür.', author: 'Cemal Süreya' },
    { text: 'Hayatı ciddiye alın ama kendinizi çok ciddiye almayın.', author: 'Barış Manço' },
    { text: 'Kitaplar, dünyanın en sessiz ve en sadık dostlarıdır.', author: 'Ömer Hayyam' },
    { text: 'Aşk, görmekle değil, hissetmekle olur.', author: 'Mevlana' },
    { text: 'Dünya, kötülerin yaptıklarından değil, iyilerin sessiz kalmasından yanar.', author: 'Albert Einstein' },
    { text: 'Bir mum diğer bir mumu yakmakla ışığından bir şey kaybetmez.', author: 'Mevlana' },
    { text: 'Mutluluk, yolculuğun kendisindedir, varış noktasında değil.', author: 'Konfüçyüs' },
    { text: 'En büyük zafer, kendi kendini tanımaktır.', author: 'Sokrates' },
    { text: 'Her şey geçicidir; üzüntüler de, sevinçler de.', author: 'Mevlana' },
    { text: 'Gerçek bilgelik, bilmediğini bilmektir.', author: 'Sokrates' },
    { text: 'Yüreğinle gördüğün zaman, gözlerin asla göremeyeceği şeyleri görürsün.', author: 'Mevlana' },
  ],
  de: [
    { text: 'Wer kämpft, kann verlieren. Wer nicht kämpft, hat schon verloren.', author: 'Bertolt Brecht' },
    { text: 'Man sieht nur mit dem Herzen gut. Das Wesentliche ist für die Augen unsichtbar.', author: 'Antoine de Saint-Exupéry' },
    { text: 'Es ist nicht genug zu wissen – man muss auch anwenden.', author: 'Johann Wolfgang von Goethe' },
    { text: 'Wer immer tut, was er schon kann, bleibt immer das, was er schon ist.', author: 'Henry Ford' },
    { text: 'Die Grenzen meiner Sprache bedeuten die Grenzen meiner Welt.', author: 'Ludwig Wittgenstein' },
    { text: 'Phantasie ist wichtiger als Wissen, denn Wissen ist begrenzt.', author: 'Albert Einstein' },
    { text: 'Auch aus Steinen, die einem in den Weg gelegt werden, kann man Schönes bauen.', author: 'Johann Wolfgang von Goethe' },
    { text: 'Die Musik drückt das aus, was nicht gesagt werden kann.', author: 'Victor Hugo' },
    { text: 'Jeder Tag ist ein neuer Anfang.', author: 'T.S. Eliot' },
    { text: 'Lebe, als würdest du morgen sterben. Lerne, als würdest du ewig leben.', author: 'Mahatma Gandhi' },
    { text: 'Der Weg ist das Ziel.', author: 'Konfuzius' },
    { text: 'Was mich nicht umbringt, macht mich stärker.', author: 'Friedrich Nietzsche' },
    { text: 'Werde, der du bist.', author: 'Friedrich Nietzsche' },
    { text: 'In der Mitte von Schwierigkeiten liegen die Möglichkeiten.', author: 'Albert Einstein' },
    { text: 'Ein Tropfen Liebe ist mehr als ein Ozean Verstand.', author: 'Blaise Pascal' },
    { text: 'Nichts auf der Welt ist so mächtig wie eine Idee, deren Zeit gekommen ist.', author: 'Victor Hugo' },
    { text: 'Geduld ist die Kunst zu hoffen.', author: 'Luc de Clapiers' },
    { text: 'Die einzige Art, gegen die Pest zu kämpfen, ist die Ehrlichkeit.', author: 'Albert Camus' },
    { text: 'Ohne Musik wäre das Leben ein Irrtum.', author: 'Friedrich Nietzsche' },
    { text: 'Die beste Zeit, einen Baum zu pflanzen, war vor zwanzig Jahren. Die zweitbeste ist jetzt.', author: 'Chinesisches Sprichwort' },
  ],
  fr: [
    { text: 'On ne voit bien qu\'avec le cœur. L\'essentiel est invisible pour les yeux.', author: 'Antoine de Saint-Exupéry' },
    { text: 'La vie, c\'est ce qui arrive quand on est occupé à faire d\'autres plans.', author: 'John Lennon' },
    { text: 'L\'imagination est plus importante que le savoir.', author: 'Albert Einstein' },
    { text: 'Il n\'y a qu\'un bonheur dans la vie, c\'est d\'aimer et d\'être aimé.', author: 'George Sand' },
    { text: 'Le courage n\'est pas l\'absence de peur, mais la capacité de la vaincre.', author: 'Nelson Mandela' },
    { text: 'Rien n\'est impossible, le mot lui-même dit "je suis possible".', author: 'Audrey Hepburn' },
    { text: 'La simplicité est la sophistication suprême.', author: 'Léonard de Vinci' },
    { text: 'La musique est la langue des émotions.', author: 'Emmanuel Kant' },
    { text: 'Celui qui déplace une montagne commence par déplacer de petites pierres.', author: 'Confucius' },
    { text: 'La liberté commence où l\'ignorance finit.', author: 'Victor Hugo' },
    { text: 'Le succès, c\'est tomber sept fois et se relever huit.', author: 'Proverbe japonais' },
    { text: 'La vie est trop courte pour être petite.', author: 'Benjamin Disraeli' },
    { text: 'Ce n\'est pas parce que les choses sont difficiles que nous n\'osons pas, c\'est parce que nous n\'osons pas qu\'elles sont difficiles.', author: 'Sénèque' },
    { text: 'L\'éducation est l\'arme la plus puissante pour changer le monde.', author: 'Nelson Mandela' },
    { text: 'Le bonheur n\'est pas une destination, c\'est un voyage.', author: 'Confucius' },
    { text: 'Il faut toujours viser la lune, car même en cas d\'échec, on atterrit dans les étoiles.', author: 'Oscar Wilde' },
    { text: 'La créativité, c\'est l\'intelligence qui s\'amuse.', author: 'Albert Einstein' },
    { text: 'Un sourire coûte moins cher que l\'électricité mais donne autant de lumière.', author: 'Abbé Pierre' },
    { text: 'Aimer, ce n\'est pas se regarder l\'un l\'autre, c\'est regarder ensemble dans la même direction.', author: 'Antoine de Saint-Exupéry' },
    { text: 'Le plus grand voyageur n\'est pas celui qui a fait dix fois le tour du monde, mais celui qui a fait une seule fois le tour de lui-même.', author: 'Mahatma Gandhi' },
  ],
  it: [
    { text: 'La semplicità è la suprema sofisticazione.', author: 'Leonardo da Vinci' },
    { text: 'Nel mezzo del cammin di nostra vita, mi ritrovai per una selva oscura.', author: 'Dante Alighieri' },
    { text: 'L\'immaginazione è più importante della conoscenza.', author: 'Albert Einstein' },
    { text: 'Chi non risica, non rosica.', author: 'Proverbio italiano' },
    { text: 'La vita è sogno, rendilo realtà.', author: 'Antoine de Saint-Exupéry' },
    { text: 'Se vuoi capire una persona, non ascoltare le sue parole, osserva il suo comportamento.', author: 'Albert Einstein' },
    { text: 'L\'unico modo di fare un ottimo lavoro è amare quello che fai.', author: 'Steve Jobs' },
    { text: 'La musica esprime ciò che non può essere detto.', author: 'Victor Hugo' },
    { text: 'Colui che conosce gli altri è sapiente; colui che conosce se stesso è illuminato.', author: 'Lao Tzu' },
    { text: 'Il segreto della felicità è la libertà. Il segreto della libertà è il coraggio.', author: 'Tucidide' },
    { text: 'Non è forte chi non cade, ma chi cadendo si rialza.', author: 'Jim Morrison' },
    { text: 'La creatività è l\'intelligenza che si diverte.', author: 'Albert Einstein' },
    { text: 'L\'educazione è l\'arma più potente che puoi usare per cambiare il mondo.', author: 'Nelson Mandela' },
    { text: 'Ogni grande viaggio comincia con un piccolo passo.', author: 'Lao Tzu' },
    { text: 'La bellezza salverà il mondo.', author: 'Fëdor Dostoevskij' },
    { text: 'Non smettere mai di sognare, perché i sogni sono i semi della realtà.', author: 'Walt Disney' },
    { text: 'Il tempo è la cosa più preziosa che un uomo possa spendere.', author: 'Teofrasto' },
    { text: 'L\'amore non si vede con gli occhi, ma con il cuore.', author: 'William Shakespeare' },
    { text: 'Sii il cambiamento che vuoi vedere nel mondo.', author: 'Mahatma Gandhi' },
    { text: 'La vita è come andare in bicicletta. Per mantenere l\'equilibrio devi muoverti.', author: 'Albert Einstein' },
  ],
};

function getDailyQuoteIndex(listLength: number): number {
  const now = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return seed % listLength;
}

function QuoteWidgetComponent({ width, height }: WidgetProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'en';

  const quote = useMemo(() => {
    const list = QUOTES[lang] || QUOTES.en;
    return list[getDailyQuoteIndex(list.length)];
  }, [lang]);

  return (
    <div
      style={{
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '16px 20px',
        overflow: 'hidden',
      }}
    >
      <p
        style={{
          color: 'rgba(255,255,255,0.9)',
          fontSize: 'var(--font-size-lg)',
          lineHeight: 1.4,
          margin: 0,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
          fontStyle: 'italic',
          opacity: 0.9,
        }}
      >
        &ldquo;{quote.text}&rdquo;
      </p>
      <span
        style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: 'var(--font-size-md)',
          marginTop: 8,
          fontWeight: 500,
        }}
      >
        — {quote.author}
      </span>
    </div>
  );
}

export const quoteWidget: WidgetDefinition = {
  id: 'quote',
  name: 'Quote of the day',
  description: 'Daily inspirational quote from a curated collection',
  icon: Quote,
  defaultEnabled: true,
  component: QuoteWidgetComponent,
};
