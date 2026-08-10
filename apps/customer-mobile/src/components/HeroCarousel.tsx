import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ImageSourcePropType,
} from 'react-native';

export interface HeroSlide {
  id: string;
  categoryName: string;
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  ctaText: string;
  imageSource?: ImageSourcePropType;
  imageUrl?: string;
}

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: '1',
    categoryName: 'AC Repair',
    titleLine1: 'Stay Cool,',
    titleLine2: 'Stay Comfortable',
    subtitle: 'Expert AC repair & maintenance at your doorstep.',
    ctaText: 'Book AC Service',
    imageSource: require('../../assets/hero_ac_repair.png'),
  },
  {
    id: '2',
    categoryName: 'Cleaning',
    titleLine1: 'A Cleaner Home,',
    titleLine2: 'Effortlessly',
    subtitle: 'Professional home cleaning by verified experts.',
    ctaText: 'Book Cleaning',
    imageSource: require('../../assets/hero_cleaning.png'),
  },
  {
    id: '3',
    categoryName: 'Plumbing',
    titleLine1: 'Plumbing Problems?',
    titleLine2: 'We’ve Got It.',
    subtitle: 'Reliable plumbers for quick repairs and installations.',
    ctaText: 'Book a Plumber',
    imageSource: require('../../assets/hero_plumbing.png'),
  },
  {
    id: '4',
    categoryName: 'Painting',
    titleLine1: 'Give Your Home',
    titleLine2: 'A Fresh Look',
    subtitle: 'Professional painting services for a beautiful finish.',
    ctaText: 'Book Painting',
    imageSource: require('../../assets/hero_painting.png'),
  },
];

interface HeroCarouselProps {
  slides?: HeroSlide[];
  onPressCTA: (categoryName: string) => void;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  slides = DEFAULT_SLIDES,
  onPressCTA,
}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();

  // Screen horizontal padding = 16 * 2 = 32
  const cardWidth = width - 32;

  // Auto slide timer (every 3 seconds)
  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = setInterval(() => {
      setActiveSlide((prev) => {
        const nextSlide = (prev + 1) % slides.length;
        scrollViewRef.current?.scrollTo({
          x: nextSlide * cardWidth,
          animated: true,
        });
        return nextSlide;
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [slides.length, cardWidth]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / cardWidth);
    if (index !== activeSlide && index >= 0 && index < slides.length) {
      setActiveSlide(index);
    }
  };

  const handleImageError = (id: string) => {
    setImageErrorMap((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <View style={styles.container} testID="hero-carousel-container">
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        decelerationRate="fast"
        snapToInterval={cardWidth}
        snapToAlignment="center"
        contentContainerStyle={styles.scrollContent}
        testID="hero-carousel-scrollview"
      >
        {slides.map((slide) => {
          const hasImageError = imageErrorMap[slide.id];
          const imageSrc = slide.imageSource || (slide.imageUrl ? { uri: slide.imageUrl } : undefined);

          return (
            <View key={slide.id} style={[styles.card, { width: cardWidth }]}>
              {/* Background image & overlay */}
              {imageSrc && !hasImageError ? (
                <Image
                  source={imageSrc}
                  style={styles.cardImage}
                  resizeMode="cover"
                  onError={() => handleImageError(slide.id)}
                />
              ) : (
                <View style={styles.fallbackBackground} />
              )}

              {/* Left-heavy Dark Gradient Reading Overlay */}
              <View style={styles.overlay} />

              {/* Content Container */}
              <View style={styles.contentContainer}>
                <View style={styles.textBlock}>
                  <Text style={styles.headlineLine1}>{slide.titleLine1}</Text>
                  <Text style={styles.headlineLine2}>{slide.titleLine2}</Text>
                  <Text style={styles.subtitle}>{slide.subtitle}</Text>
                </View>

                <TouchableOpacity
                  style={styles.ctaButton}
                  onPress={() => onPressCTA(slide.categoryName)}
                  activeOpacity={0.85}
                  accessibilityLabel={slide.ctaText}
                  testID={`btn-hero-cta-${slide.id}`}
                >
                  <Text style={styles.ctaText}>{slide.ctaText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Pagination Dots */}
      <View style={styles.paginationContainer} testID="hero-carousel-pagination">
        {slides.map((slide, index) => {
          const isActive = index === activeSlide;
          return (
            <View
              key={`dot-${slide.id}`}
              style={[
                styles.dot,
                isActive ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  card: {
    height: 195,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0c1322',
    borderWidth: 1,
    borderColor: '#1e293b',
    position: 'relative',
    justifyContent: 'center',
  },
  cardImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  fallbackBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0f172a',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6, 11, 21, 0.76)',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'space-between',
    height: '100%',
    width: '75%', // Ensure text stays on left side over dark overlay
    zIndex: 2,
  },
  textBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  headlineLine1: {
    fontSize: 21,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
    lineHeight: 25,
  },
  headlineLine2: {
    fontSize: 21,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: -0.3,
    lineHeight: 25,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12.5,
    color: '#94a3b8',
    lineHeight: 16,
    fontWeight: '400',
  },
  ctaButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 20,
    backgroundColor: '#10b981',
  },
  inactiveDot: {
    width: 6,
    backgroundColor: '#334155',
  },
});

export default HeroCarousel;
