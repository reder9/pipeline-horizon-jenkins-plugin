package io.jenkins.plugins.horizon.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

public class EncodingUtilsTest {

    @Test
    public void testNullAndEmpty() {
        assertNull(EncodingUtils.fixMojibake(null));
        assertEquals("", EncodingUtils.fixMojibake(""));
    }

    @Test
    public void testCleanAscii() {
        String input = "Hello World! Standard ASCII pipeline step [Build #44]";
        assertEquals(input, EncodingUtils.fixMojibake(input));
    }

    @Test
    public void testCleanUnicodeAndEmojis() {
        String input = "🚀 Initializing Pipeline Horizon Advanced Showcase (Build #44)...";
        assertEquals(input, EncodingUtils.fixMojibake(input));

        String input2 = "Stages: ⏳ Waiting, 📦 Packaging, 🔍 Linting, ✅ Passed, 🏁 Concluded";
        assertEquals(input2, EncodingUtils.fixMojibake(input2));
    }

    @Test
    public void testCleanLatinAccents() {
        String input = "Café au lait, Größe, Über, Español, façade";
        assertEquals(input, EncodingUtils.fixMojibake(input));
    }

    @Test
    public void testMojibakeRocketEmoji() {
        // UTF-8 bytes for 🚀 (0xF0, 0x9F, 0x9A, 0x80) misread as ISO-8859-1
        String mojibake = "\u00F0\u009F\u009A\u0080 Initializing Pipeline Horizon Advanced Showcase (Build #44)...";
        String expected = "🚀 Initializing Pipeline Horizon Advanced Showcase (Build #44)...";
        assertEquals(expected, EncodingUtils.fixMojibake(mojibake));
    }

    @Test
    public void testMojibakePackageEmoji() {
        // UTF-8 bytes for 📦 (0xF0, 0x9F, 0x93, 0xA6) misread as ISO-8859-1
        String mojibake = "\u00F0\u009F\u0093\u00A6 Packaging Docker Container Image...";
        String expected = "📦 Packaging Docker Container Image...";
        assertEquals(expected, EncodingUtils.fixMojibake(mojibake));
    }

    @Test
    public void testMojibakeHourglassAndCheckmark() {
        // UTF-8 bytes for ⏳ (0xE2, 0x8F, 0xB3) and ✅ (0xE2, 0x9C, 0x85)
        String mojibake = "\u00E2\u008F\u00B3 Waiting and \u00E2\u009C\u0085 Passed";
        String expected = "⏳ Waiting and ✅ Passed";
        assertEquals(expected, EncodingUtils.fixMojibake(mojibake));
    }

    @Test
    public void testMojibakeCp1252Mapping() {
        // CP1252 characters mapping to 0x80..0x9F
        // 0xF0, 0x9F (\u0178), 0x9A (\u0161), 0x80 (\u20AC) -> 🚀
        String cp1252Mojibake = "\u00F0\u0178\u0161\u20AC Launch";
        String expected = "🚀 Launch";
        assertEquals(expected, EncodingUtils.fixMojibake(cp1252Mojibake));
    }

    @Test
    public void testMojibakeAccentedWords() {
        // "Café" encoded as UTF-8 (C3 A9) and read as ISO-8859-1
        String mojibake = "Caf\u00C3\u00A9";
        String expected = "Café";
        assertEquals(expected, EncodingUtils.fixMojibake(mojibake));
    }
}
