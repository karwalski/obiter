<?xml version="1.0" encoding="utf-8"?>
<!--
  Obiter — AGLC4 Word Add-in
  Copyright (C) 2026. Licensed under GPLv3.

  AGLC4 Bibliography Style for Microsoft Word
  Implements the Australian Guide to Legal Citation (4th Edition)
  for Word's built-in References tab > Style picker.
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:b="http://schemas.openxmlformats.org/officeDocument/2006/bibliography"
                version="1.0">

  <xsl:output method="html" encoding="us-ascii"/>

  <!-- ================================================================
       Word metadata: version and style name
       ================================================================ -->
  <xsl:template match="/">
    <xsl:choose>
      <xsl:when test="b:Version">
        <xsl:text>2006.5.07</xsl:text>
      </xsl:when>
      <xsl:when test="b:StyleName">
        <xsl:text>AGLC4</xsl:text>
      </xsl:when>

      <!-- ============================================================
           CITATION (footnote) formatting
           ============================================================ -->
      <xsl:when test="b:GetImportant">
        <xsl:text>True</xsl:text>
      </xsl:when>

      <xsl:when test="b:Citation">
        <xsl:for-each select="b:Citation/b:Source">
          <xsl:call-template name="FormatFootnote"/>
        </xsl:for-each>
      </xsl:when>

      <!-- ============================================================
           BIBLIOGRAPHY formatting
           ============================================================ -->
      <xsl:when test="b:Bibliography">
        <html xmlns="http://www.w3.org/1999/xhtml">
          <body>
            <!-- Articles -->
            <xsl:if test="b:Bibliography/b:Source[b:SourceType='JournalArticle']">
              <p><b>Articles</b></p>
              <xsl:for-each select="b:Bibliography/b:Source[b:SourceType='JournalArticle']">
                <xsl:sort select="b:Author/b:Author/b:NameList/b:Person[1]/b:Last"/>
                <p>
                  <xsl:call-template name="FormatBibliography"/>
                </p>
              </xsl:for-each>
            </xsl:if>

            <!-- Books -->
            <xsl:if test="b:Bibliography/b:Source[b:SourceType='Book']">
              <p><b>Books</b></p>
              <xsl:for-each select="b:Bibliography/b:Source[b:SourceType='Book']">
                <xsl:sort select="b:Author/b:Author/b:NameList/b:Person[1]/b:Last"/>
                <p>
                  <xsl:call-template name="FormatBibliography"/>
                </p>
              </xsl:for-each>
            </xsl:if>

            <!-- Cases -->
            <xsl:if test="b:Bibliography/b:Source[b:SourceType='Case']">
              <p><b>Cases</b></p>
              <xsl:for-each select="b:Bibliography/b:Source[b:SourceType='Case']">
                <xsl:sort select="b:Title"/>
                <p>
                  <xsl:call-template name="FormatBibliography"/>
                </p>
              </xsl:for-each>
            </xsl:if>

            <!-- Reports -->
            <xsl:if test="b:Bibliography/b:Source[b:SourceType='Report']">
              <p><b>Reports</b></p>
              <xsl:for-each select="b:Bibliography/b:Source[b:SourceType='Report']">
                <xsl:sort select="b:Author/b:Author/b:NameList/b:Person[1]/b:Last"/>
                <p>
                  <xsl:call-template name="FormatBibliography"/>
                </p>
              </xsl:for-each>
            </xsl:if>

            <!-- Internet Sources (Misc and InternetSite) -->
            <xsl:if test="b:Bibliography/b:Source[b:SourceType='Misc' or b:SourceType='InternetSite']">
              <p><b>Other Sources</b></p>
              <xsl:for-each select="b:Bibliography/b:Source[b:SourceType='Misc' or b:SourceType='InternetSite']">
                <xsl:sort select="b:Author/b:Author/b:NameList/b:Person[1]/b:Last"/>
                <p>
                  <xsl:call-template name="FormatBibliography"/>
                </p>
              </xsl:for-each>
            </xsl:if>
          </body>
        </html>
      </xsl:when>
    </xsl:choose>
  </xsl:template>

  <!-- ================================================================
       FOOTNOTE TEMPLATES — AGLC4 footnote citation format
       ================================================================ -->
  <xsl:template name="FormatFootnote">
    <xsl:choose>

      <!-- Book — AGLC4 Rule 6
           Author, Title (Publisher, Edition, Year) Pinpoint. -->
      <xsl:when test="b:SourceType='Book'">
        <xsl:call-template name="AuthorNormal"/>
        <xsl:text>, </xsl:text>
        <i><xsl:value-of select="b:Title"/></i>
        <xsl:text> (</xsl:text>
        <xsl:if test="b:Publisher != ''">
          <xsl:value-of select="b:Publisher"/>
          <xsl:text>, </xsl:text>
        </xsl:if>
        <xsl:if test="b:Edition != ''">
          <xsl:value-of select="b:Edition"/>
          <xsl:text>, </xsl:text>
        </xsl:if>
        <xsl:value-of select="b:Year"/>
        <xsl:text>)</xsl:text>
        <xsl:if test="b:Pages != ''">
          <xsl:text> </xsl:text>
          <xsl:value-of select="b:Pages"/>
        </xsl:if>
        <xsl:text>.</xsl:text>
      </xsl:when>

      <!-- JournalArticle — AGLC4 Rule 5
           Author, 'Title' (Year) Volume Journal StartingPage. -->
      <xsl:when test="b:SourceType='JournalArticle'">
        <xsl:call-template name="AuthorNormal"/>
        <xsl:text>, '</xsl:text>
        <xsl:value-of select="b:Title"/>
        <xsl:text>' (</xsl:text>
        <xsl:value-of select="b:Year"/>
        <xsl:text>) </xsl:text>
        <xsl:if test="b:Volume != ''">
          <xsl:value-of select="b:Volume"/>
          <xsl:text> </xsl:text>
        </xsl:if>
        <i><xsl:value-of select="b:JournalName"/></i>
        <xsl:text> </xsl:text>
        <xsl:value-of select="b:Pages"/>
        <xsl:text>.</xsl:text>
      </xsl:when>

      <!-- Case — AGLC4 Rules 2.1–2.3
           Case Name Year Volume Report Series StartingPage. -->
      <xsl:when test="b:SourceType='Case'">
        <i><xsl:value-of select="b:Title"/></i>
        <xsl:if test="b:Year != ''">
          <xsl:text> </xsl:text>
          <!-- Use round brackets for unreported/medium neutral, square otherwise -->
          <xsl:choose>
            <xsl:when test="b:Volume != ''">
              <xsl:text>[</xsl:text>
              <xsl:value-of select="b:Year"/>
              <xsl:text>]</xsl:text>
            </xsl:when>
            <xsl:otherwise>
              <xsl:text>(</xsl:text>
              <xsl:value-of select="b:Year"/>
              <xsl:text>)</xsl:text>
            </xsl:otherwise>
          </xsl:choose>
        </xsl:if>
        <xsl:if test="b:Volume != ''">
          <xsl:text> </xsl:text>
          <xsl:value-of select="b:Volume"/>
        </xsl:if>
        <xsl:if test="b:Reporter != ''">
          <xsl:text> </xsl:text>
          <xsl:value-of select="b:Reporter"/>
        </xsl:if>
        <xsl:if test="b:Pages != ''">
          <xsl:text> </xsl:text>
          <xsl:value-of select="b:Pages"/>
        </xsl:if>
        <xsl:text>.</xsl:text>
      </xsl:when>

      <!-- Report — AGLC4 Rule 7.1
           Author, Title (Report Type No, Year). -->
      <xsl:when test="b:SourceType='Report'">
        <xsl:call-template name="AuthorNormal"/>
        <xsl:text>, </xsl:text>
        <i><xsl:value-of select="b:Title"/></i>
        <xsl:text> (</xsl:text>
        <xsl:if test="b:ThesisType != ''">
          <xsl:value-of select="b:ThesisType"/>
          <xsl:text>, </xsl:text>
        </xsl:if>
        <xsl:value-of select="b:Year"/>
        <xsl:text>)</xsl:text>
        <xsl:text>.</xsl:text>
      </xsl:when>

      <!-- Misc / InternetSite — AGLC4 Rule 7.15
           Author, Title (Web Page, Year) <URL>. -->
      <xsl:when test="b:SourceType='Misc' or b:SourceType='InternetSite'">
        <xsl:call-template name="AuthorNormal"/>
        <xsl:text>, '</xsl:text>
        <xsl:value-of select="b:Title"/>
        <xsl:text>' (</xsl:text>
        <xsl:if test="b:Medium != ''">
          <xsl:value-of select="b:Medium"/>
          <xsl:text>, </xsl:text>
        </xsl:if>
        <xsl:value-of select="b:Year"/>
        <xsl:text>)</xsl:text>
        <xsl:if test="b:URL != ''">
          <xsl:text> &lt;</xsl:text>
          <xsl:value-of select="b:URL"/>
          <xsl:text>&gt;</xsl:text>
        </xsl:if>
        <xsl:text>.</xsl:text>
      </xsl:when>

      <!-- Fallback for unsupported types -->
      <xsl:otherwise>
        <xsl:value-of select="b:Title"/>
        <xsl:text>.</xsl:text>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- ================================================================
       BIBLIOGRAPHY TEMPLATES — AGLC4 bibliography format
       Author name inverted (Surname, Given Names), no trailing full stop
       ================================================================ -->
  <xsl:template name="FormatBibliography">
    <xsl:choose>

      <!-- Book bibliography -->
      <xsl:when test="b:SourceType='Book'">
        <xsl:call-template name="AuthorInverted"/>
        <xsl:text>, </xsl:text>
        <i><xsl:value-of select="b:Title"/></i>
        <xsl:text> (</xsl:text>
        <xsl:if test="b:Publisher != ''">
          <xsl:value-of select="b:Publisher"/>
          <xsl:text>, </xsl:text>
        </xsl:if>
        <xsl:if test="b:Edition != ''">
          <xsl:value-of select="b:Edition"/>
          <xsl:text>, </xsl:text>
        </xsl:if>
        <xsl:value-of select="b:Year"/>
        <xsl:text>)</xsl:text>
      </xsl:when>

      <!-- JournalArticle bibliography -->
      <xsl:when test="b:SourceType='JournalArticle'">
        <xsl:call-template name="AuthorInverted"/>
        <xsl:text>, '</xsl:text>
        <xsl:value-of select="b:Title"/>
        <xsl:text>' (</xsl:text>
        <xsl:value-of select="b:Year"/>
        <xsl:text>) </xsl:text>
        <xsl:if test="b:Volume != ''">
          <xsl:value-of select="b:Volume"/>
          <xsl:text> </xsl:text>
        </xsl:if>
        <i><xsl:value-of select="b:JournalName"/></i>
        <xsl:text> </xsl:text>
        <xsl:value-of select="b:Pages"/>
      </xsl:when>

      <!-- Case bibliography — same as footnote, cases have no inverted names -->
      <xsl:when test="b:SourceType='Case'">
        <i><xsl:value-of select="b:Title"/></i>
        <xsl:if test="b:Year != ''">
          <xsl:text> </xsl:text>
          <xsl:choose>
            <xsl:when test="b:Volume != ''">
              <xsl:text>[</xsl:text>
              <xsl:value-of select="b:Year"/>
              <xsl:text>]</xsl:text>
            </xsl:when>
            <xsl:otherwise>
              <xsl:text>(</xsl:text>
              <xsl:value-of select="b:Year"/>
              <xsl:text>)</xsl:text>
            </xsl:otherwise>
          </xsl:choose>
        </xsl:if>
        <xsl:if test="b:Volume != ''">
          <xsl:text> </xsl:text>
          <xsl:value-of select="b:Volume"/>
        </xsl:if>
        <xsl:if test="b:Reporter != ''">
          <xsl:text> </xsl:text>
          <xsl:value-of select="b:Reporter"/>
        </xsl:if>
        <xsl:if test="b:Pages != ''">
          <xsl:text> </xsl:text>
          <xsl:value-of select="b:Pages"/>
        </xsl:if>
      </xsl:when>

      <!-- Report bibliography -->
      <xsl:when test="b:SourceType='Report'">
        <xsl:call-template name="AuthorInverted"/>
        <xsl:text>, </xsl:text>
        <i><xsl:value-of select="b:Title"/></i>
        <xsl:text> (</xsl:text>
        <xsl:if test="b:ThesisType != ''">
          <xsl:value-of select="b:ThesisType"/>
          <xsl:text>, </xsl:text>
        </xsl:if>
        <xsl:value-of select="b:Year"/>
        <xsl:text>)</xsl:text>
      </xsl:when>

      <!-- Misc / InternetSite bibliography -->
      <xsl:when test="b:SourceType='Misc' or b:SourceType='InternetSite'">
        <xsl:call-template name="AuthorInverted"/>
        <xsl:text>, '</xsl:text>
        <xsl:value-of select="b:Title"/>
        <xsl:text>' (</xsl:text>
        <xsl:if test="b:Medium != ''">
          <xsl:value-of select="b:Medium"/>
          <xsl:text>, </xsl:text>
        </xsl:if>
        <xsl:value-of select="b:Year"/>
        <xsl:text>)</xsl:text>
        <xsl:if test="b:URL != ''">
          <xsl:text> &lt;</xsl:text>
          <xsl:value-of select="b:URL"/>
          <xsl:text>&gt;</xsl:text>
        </xsl:if>
      </xsl:when>

      <!-- Fallback -->
      <xsl:otherwise>
        <xsl:value-of select="b:Title"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- ================================================================
       AUTHOR HELPERS
       ================================================================ -->

  <!-- Normal order: Given Names Surname -->
  <xsl:template name="AuthorNormal">
    <xsl:for-each select="b:Author/b:Author/b:NameList/b:Person">
      <xsl:if test="position() &gt; 1 and position() != last()">
        <xsl:text>, </xsl:text>
      </xsl:if>
      <xsl:if test="position() &gt; 1 and position() = last()">
        <xsl:text> and </xsl:text>
      </xsl:if>
      <xsl:value-of select="b:First"/>
      <xsl:if test="b:Middle != ''">
        <xsl:text> </xsl:text>
        <xsl:value-of select="b:Middle"/>
      </xsl:if>
      <xsl:text> </xsl:text>
      <xsl:value-of select="b:Last"/>
    </xsl:for-each>
  </xsl:template>

  <!-- Inverted order for bibliography: Surname, Given Names -->
  <xsl:template name="AuthorInverted">
    <xsl:for-each select="b:Author/b:Author/b:NameList/b:Person">
      <xsl:choose>
        <xsl:when test="position() = 1">
          <xsl:value-of select="b:Last"/>
          <xsl:text>, </xsl:text>
          <xsl:value-of select="b:First"/>
          <xsl:if test="b:Middle != ''">
            <xsl:text> </xsl:text>
            <xsl:value-of select="b:Middle"/>
          </xsl:if>
        </xsl:when>
        <xsl:otherwise>
          <xsl:if test="position() != last()">
            <xsl:text>, </xsl:text>
          </xsl:if>
          <xsl:if test="position() = last()">
            <xsl:text> and </xsl:text>
          </xsl:if>
          <xsl:value-of select="b:First"/>
          <xsl:if test="b:Middle != ''">
            <xsl:text> </xsl:text>
            <xsl:value-of select="b:Middle"/>
          </xsl:if>
          <xsl:text> </xsl:text>
          <xsl:value-of select="b:Last"/>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:for-each>
  </xsl:template>

</xsl:stylesheet>
